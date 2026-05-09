import { Client, ActiveRental, RentHistory } from '@trolley/shared';
import { clientRepository } from '../repositories/client.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { trolleyRepository } from '../repositories/trolley.repository';

/* ── Date helpers ── */

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDDMMYYYY(str: string): Date {
  if (!str) return new Date(0);
  const [day, month, year] = str.split('-');
  return new Date(`${year}-${month}-${day}T00:00:00`);
}

function formatDDMMYYYY(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

function getRentForCycle(
  cycleDateStr: string,
  rentHistory: RentHistory[],
  fallbackRent: number,
): number {
  if (!rentHistory?.length) return Number(fallbackRent);
  const cycleDate = parseDDMMYYYY(cycleDateStr);

  const sorted = [...rentHistory].sort(
    (a, b) =>
      parseDDMMYYYY(a.effectiveDate).getTime() -
      parseDDMMYYYY(b.effectiveDate).getTime(),
  );

  let current = Number(fallbackRent);
  for (const h of sorted) {
    if (parseDDMMYYYY(h.effectiveDate).getTime() <= cycleDate.getTime()) {
      current = Number(h.amount);
    }
  }
  return current;
}

/* ── Service ── */

export const clientService = {
  async addClient(userId: string, input: any): Promise<Client> {
    const rental = input.activeRentals[0];
    const start = parseDDMMYYYY(rental.startDate);
    const today = new Date();
    const rent = Number(rental.monthlyRent);

    let advance = Number(input.advance) || 0;
    let pending = 0;

    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const cyclesPassed = diffDays >= 30 ? Math.floor(diffDays / 30) + 1 : 1;

    for (let i = 0; i < cyclesPassed; i++) {
      if (advance >= rent) {
        advance -= rent;
      } else {
        pending += rent - advance;
        advance = 0;
      }
      if (pending < 0) {
        advance = Math.abs(pending);
        pending = 0;
      }
    }

    const nextDueDate = addDays(start, 30 * cyclesPassed);

    const updatedRental: ActiveRental = {
      ...rental,
      startDate: formatDDMMYYYY(start),
      pending,
      nextRentDueDate: formatDDMMYYYY(nextDueDate),
      lastRentAddedOn: formatDDMMYYYY(start),
      rentHistory: [{ effectiveDate: formatDDMMYYYY(start), amount: rent }],
    };

    const newClient = {
      ...input,
      userId,
      activeRentals: [updatedRental],
      pendingAmount: pending,
      totalPaidAmount: 0,
      advance,
      initialAdvance: Number(input.advance) || 0,
    };

    const created = await clientRepository.create(userId, newClient);

    if (Number(input.advance) > 0) {
      await paymentRepository.create(userId, created.id, {
        amount: Number(input.advance),
        date: formatDDMMYYYY(start),
        type: 'advance_manual',
        notes: `Initial advance ₹${input.advance}`,
      });
    }

    const trolley = await trolleyRepository.findById(userId, rental.trolleyNo);
    if (trolley) {
      await trolleyRepository.update(userId, rental.trolleyNo, {
        isAvailable: false,
        currentClient: newClient.name,
        currentClientId: created.id,
        history: [
          ...(trolley.history || []),
          {
            action: 'Rented',
            clientName: newClient.name,
            clientId: created.id,
            date: formatDDMMYYYY(new Date()),
          },
        ],
      });
    }

    return created;
  },

  async updateClient(userId: string, clientId: string, newDetails: any): Promise<void> {
    const old = await clientRepository.findById(userId, clientId);
    if (!old) return;

    const oldRental = old.activeRentals?.[0] || {};
    const newRental = newDetails.activeRentals?.[0] || null;

    let finalData = { ...old, ...newDetails };

    if (newRental && oldRental.startDate !== newRental.startDate) {
      finalData.activeRentals = [{ ...oldRental, ...newRental }];
    }

    Object.keys(finalData).forEach((k) => {
      if ((finalData as any)[k] === undefined) delete (finalData as any)[k];
    });

    await clientRepository.update(userId, clientId, finalData);

    const newName = finalData.name || old.name;
    const newStartDate = finalData.activeRentals?.[0]?.startDate;
    await clientService.updateTrolleyHistoryForClient(userId, clientId, newName, newStartDate);
  },

  async deleteClient(userId: string, clientId: string): Promise<void> {
    const client = await clientRepository.findById(userId, clientId);
    if (!client) return;

    await clientRepository.delete(userId, clientId);

    for (const rental of client.activeRentals || []) {
      await trolleyRepository.update(userId, rental.trolleyNo, {
        isAvailable: true,
        currentClient: null,
        currentClientId: null,
      });
    }
  },

  async syncClientRent(userId: string, clientId: string): Promise<void> {
    const client = await clientRepository.findById(userId, clientId);
    if (!client?.activeRentals?.length) return;

    let rentals = [...client.activeRentals];
    let changed = false;
    let advanceBalance =
      client.advance !== undefined ? Number(client.advance) : Number(client.initialAdvance || 0);

    const todayStr = formatDDMMYYYY(new Date());
    const todayClean = parseDDMMYYYY(todayStr);

    rentals = await Promise.all(
      rentals.map(async (rental) => {
        let dueDate = rental.nextRentDueDate
          ? parseDDMMYYYY(rental.nextRentDueDate)
          : null;

        if (!dueDate || isNaN(dueDate.getTime())) {
          const start = parseDDMMYYYY(rental.startDate);
          return {
            ...rental,
            nextRentDueDate: formatDDMMYYYY(addDays(start, 30)),
            lastRentAddedOn: formatDDMMYYYY(start),
          };
        }

        if (rental.lastRentAddedOn === todayStr) return rental;
        if (dueDate.getTime() > todayClean.getTime()) return rental;

        const diffDays = Math.floor(
          (new Date().getTime() - dueDate.getTime()) / 86400000,
        );
        const cyclesMissed = Math.max(Math.floor(diffDays / 30) + 1, 1);

        let pending = Number(rental.pending || 0);
        let nextDue = dueDate;

        for (let i = 0; i < cyclesMissed; i++) {
          changed = true;
          const rent = getRentForCycle(
            formatDDMMYYYY(nextDue),
            rental.rentHistory,
            rental.monthlyRent,
          );

          await paymentRepository.create(userId, clientId, {
            amount: rent,
            date: formatDDMMYYYY(nextDue),
            type: 'rent_auto',
            notes: `Auto rent added for cycle ${i + 1}`,
          });

          if (advanceBalance >= rent) {
            advanceBalance -= rent;
          } else {
            pending += rent - advanceBalance;
            advanceBalance = 0;
          }

          if (pending < 0) {
            advanceBalance = Math.abs(pending);
            pending = 0;
          }

          nextDue = addDays(nextDue, 30);
        }

        return {
          ...rental,
          pending,
          nextRentDueDate: formatDDMMYYYY(nextDue),
          lastRentAddedOn: todayStr,
        };
      }),
    );

    if (changed) {
      const activePending = rentals.reduce((s, r) => s + Number(r.pending || 0), 0);
      const pastPending = (client.pastRentals || []).reduce(
        (s, r) => s + Number(r.pending || 0),
        0,
      );
      await clientRepository.update(userId, clientId, {
        activeRentals: rentals,
        pendingAmount: activePending + pastPending,
        advance: advanceBalance,
      });
    }
  },

  async editRentHistoryForCycle(
    userId: string,
    clientId: string,
    trolleyNo: string,
    targetCycleDateStr: string,
    newRentAmount: number,
  ): Promise<void> {
    const clientData = await clientRepository.findById(userId, clientId);
    if (!clientData) return;

    const rentalIndex = clientData.activeRentals?.findIndex(
      (r) => r.trolleyNo === trolleyNo,
    );
    if (rentalIndex === undefined || rentalIndex === -1) return;

    const rental = clientData.activeRentals[rentalIndex];
    const oldHistory: RentHistory[] = JSON.parse(
      JSON.stringify(
        rental.rentHistory || [{ effectiveDate: rental.startDate, amount: rental.monthlyRent }],
      ),
    );
    let updatedHistory: RentHistory[] = JSON.parse(JSON.stringify(oldHistory));

    const existing = updatedHistory.findIndex(
      (h) => h.effectiveDate === targetCycleDateStr,
    );
    if (existing >= 0) {
      updatedHistory[existing].amount = newRentAmount;
    } else {
      updatedHistory.push({ effectiveDate: targetCycleDateStr, amount: newRentAmount });
    }

    updatedHistory.sort(
      (a, b) =>
        parseDDMMYYYY(a.effectiveDate).getTime() -
        parseDDMMYYYY(b.effectiveDate).getTime(),
    );

    clientData.activeRentals[rentalIndex].rentHistory = updatedHistory;

    const lastDateStr =
      rental.nextRentDueDate ||
      rental.lastRentAddedOn ||
      formatDDMMYYYY(addDays(parseDDMMYYYY(rental.startDate), 30));

    const end = parseDDMMYYYY(lastDateStr);
    let iterDate = parseDDMMYYYY(rental.startDate);
    let oldLiability = 0;
    let newLiability = 0;

    const payments = await paymentRepository.findAll(userId, clientId);

    while (iterDate.getTime() < end.getTime()) {
      const cycleStr = formatDDMMYYYY(iterDate);
      const newRent = getRentForCycle(cycleStr, updatedHistory, rental.monthlyRent);
      const oldRent = getRentForCycle(cycleStr, oldHistory, rental.monthlyRent);

      newLiability += newRent;
      oldLiability += oldRent;

      const autoDoc = payments.find(
        (p) => p.type === 'rent_auto' && p.date === cycleStr,
      );
      if (autoDoc && autoDoc.amount !== newRent) {
        await paymentRepository.update(userId, clientId, autoDoc.id, {
          amount: newRent,
          notes: `Auto rent updated for cycle (${cycleStr})`,
        });
      }

      iterDate = addDays(iterDate, 30);
    }

    const diff = newLiability - oldLiability;
    let currentAdvance = Number(clientData.advance || 0);
    let currentPending = Number(clientData.pendingAmount || 0);

    if (diff > 0) {
      if (currentAdvance >= diff) {
        currentAdvance -= diff;
      } else {
        currentPending += diff - currentAdvance;
        currentAdvance = 0;
      }
    } else if (diff < 0) {
      const credit = Math.abs(diff);
      if (currentPending >= credit) {
        currentPending -= credit;
      } else {
        currentAdvance += credit - currentPending;
        currentPending = 0;
      }
    }

    let localPending = Number(clientData.activeRentals[rentalIndex].pending || 0) + diff;
    if (localPending < 0) localPending = 0;
    clientData.activeRentals[rentalIndex].pending = localPending;

    await clientRepository.update(userId, clientId, {
      activeRentals: clientData.activeRentals,
      advance: currentAdvance,
      pendingAmount: currentPending,
    });
  },

  async updateTrolleyHistoryForClient(
    userId: string,
    clientId: string,
    newName: string,
    newStartDate?: string,
  ): Promise<void> {
    const trolleys = await trolleyRepository.findAll(userId);
    const affected = trolleys.filter((t) =>
      t.history?.some((h) => h.clientId === clientId),
    );

    for (const trolley of affected) {
      const updatedHistory = trolley.history.map((entry) => {
        if (entry.clientId !== clientId) return entry;
        return {
          ...entry,
          clientName: newName,
          fromDate: newStartDate || entry.fromDate,
        };
      });
      await trolleyRepository.update(userId, trolley.id, { history: updatedHistory });
    }
  },
};
