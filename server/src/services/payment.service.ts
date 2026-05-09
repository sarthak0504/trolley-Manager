import { Client, ActiveRental, PastRental } from '@trolley/shared';
import { clientRepository } from '../repositories/client.repository';
import { paymentRepository } from '../repositories/payment.repository';

/* ── FIFO helpers ── */

function clearPendingFIFO(
  rentals: (ActiveRental | PastRental)[],
  amt: number,
): { rentals: (ActiveRental | PastRental)[]; remaining: number } {
  const updated = rentals.map((r) => ({ ...r }));
  let remaining = amt;

  for (const r of updated) {
    const pending = Number(r.pending || 0);
    if (pending <= 0) continue;
    if (remaining >= pending) {
      remaining -= pending;
      r.pending = 0;
    } else {
      r.pending = pending - remaining;
      remaining = 0;
    }
    if (remaining === 0) break;
  }

  return { rentals: updated, remaining };
}

function restorePendingFIFO(
  rentals: (ActiveRental | PastRental)[],
  amt: number,
): { rentals: (ActiveRental | PastRental)[]; remaining: number } {
  const updated = rentals.map((r) => ({ ...r }));
  let remaining = amt;

  for (const r of updated) {
    if (remaining <= 0) break;
    r.pending = Number(r.pending || 0) + remaining;
    remaining = 0;
  }

  return { rentals: updated, remaining };
}

function calcPendingAmount(
  active: (ActiveRental | PastRental)[],
  past: (ActiveRental | PastRental)[],
): number {
  return (
    active.reduce((s, r) => s + Number(r.pending || 0), 0) +
    past.reduce((s, r) => s + Number(r.pending || 0), 0)
  );
}

function applyPayment(client: Client, amount: number): Partial<Client> {
  let activeRentals = [...(client.activeRentals || [])];
  let pastRentals = [...(client.pastRentals || [])];
  let advance = Number(client.advance) || 0;
  let totalPaidAmount = Number(client.totalPaidAmount || 0);

  let remaining = amount;

  const c1 = clearPendingFIFO(activeRentals, remaining);
  activeRentals = c1.rentals as typeof activeRentals;
  remaining = c1.remaining;

  const c2 = clearPendingFIFO(pastRentals, remaining);
  pastRentals = c2.rentals as typeof pastRentals;
  remaining = c2.remaining;

  advance += remaining;
  totalPaidAmount += amount;

  return {
    activeRentals,
    pastRentals,
    advance,
    totalPaidAmount,
    pendingAmount: calcPendingAmount(activeRentals, pastRentals),
  };
}

function reversePayment(client: Client, amount: number): Partial<Client> {
  let activeRentals = [...(client.activeRentals || [])];
  let pastRentals = [...(client.pastRentals || [])];
  let advance = Number(client.advance) || 0;
  let totalPaidAmount = Number(client.totalPaidAmount || 0);

  totalPaidAmount -= amount;
  let remaining = amount;

  if (advance >= remaining) {
    advance -= remaining;
    remaining = 0;
  } else {
    remaining -= advance;
    advance = 0;
  }

  if (remaining > 0) {
    const r1 = restorePendingFIFO(pastRentals, remaining);
    pastRentals = r1.rentals as typeof pastRentals;
    remaining = r1.remaining;
  }
  if (remaining > 0) {
    const r2 = restorePendingFIFO(activeRentals, remaining);
    activeRentals = r2.rentals as typeof activeRentals;
  }

  return {
    activeRentals,
    pastRentals,
    advance,
    totalPaidAmount,
    pendingAmount: calcPendingAmount(activeRentals, pastRentals),
  };
}

/* ── Service ── */

export const paymentService = {
  async addPayment(userId: string, clientId: string, payment: any): Promise<void> {
    const client = await clientRepository.findById(userId, clientId);
    if (!client) return;

    const clean: any = {};
    for (const [k, v] of Object.entries(payment)) {
      if (v !== undefined && v !== null) clean[k] = v;
    }
    clean.type = clean.type || 'manual';

    const amount = Number(clean.amount || 0);
    if (!amount || isNaN(amount)) return;

    await paymentRepository.create(userId, clientId, clean);
    const updates = applyPayment(client, amount);
    await clientRepository.update(userId, clientId, updates);
  },

  async updatePayment(
    userId: string,
    clientId: string,
    paymentId: string,
    newData: any,
    oldAmount: number,
  ): Promise<void> {
    const client = await clientRepository.findById(userId, clientId);
    if (!client) return;

    const newAmt = Number(newData.amount || 0);
    const delta = newAmt - Number(oldAmount || 0);

    await paymentRepository.update(userId, clientId, paymentId, {
      ...newData,
      id: paymentId,
      type: newData.type || 'manual',
    });

    if (delta === 0) return;

    const updates =
      delta > 0
        ? applyPayment(client, delta)
        : reversePayment(client, Math.abs(delta));

    await clientRepository.update(userId, clientId, updates);
  },

  async deletePayment(
    userId: string,
    clientId: string,
    paymentId: string,
    amount: number,
  ): Promise<void> {
    const client = await clientRepository.findById(userId, clientId);
    if (!client) return;

    const payment = await paymentRepository.findById(userId, clientId, paymentId);
    if (!payment) return;

    await paymentRepository.delete(userId, clientId, paymentId);

    if (payment.type === 'manual') {
      const updates = reversePayment(client, Number(amount));
      await clientRepository.update(userId, clientId, updates);
    }
  },
};
