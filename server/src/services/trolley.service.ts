import { Trolley } from '@trolley/shared';
import { trolleyRepository } from '../repositories/trolley.repository';

export const trolleyService = {
  async addTrolley(userId: string, id: string): Promise<Trolley> {
    const trolley: Trolley = {
      id,
      isAvailable: true,
      currentClient: null,
      pending: 0,
      history: [],
    };
    await trolleyRepository.create(userId, trolley);
    return trolley;
  },

  async toggleAvailability(userId: string, trolleyId: string): Promise<void> {
    const trolley = await trolleyRepository.findById(userId, trolleyId);
    if (!trolley) return;

    await trolleyRepository.update(userId, trolleyId, {
      isAvailable: !trolley.isAvailable,
      currentClient: trolley.isAvailable ? null : trolley.currentClient,
    });
  },

  async assignTrolley(
    userId: string,
    trolleyId: string,
    clientId: string,
    clientName: string,
  ): Promise<void> {
    const trolley = await trolleyRepository.findById(userId, trolleyId);
    if (!trolley) return;

    await trolleyRepository.update(userId, trolleyId, {
      isAvailable: false,
      currentClient: clientName,
      history: [
        ...(trolley.history || []),
        {
          clientId,
          clientName,
          fromDate: new Date().toLocaleDateString(),
          toDate: null,
        },
      ],
    });
  },

  async markReturned(
    userId: string,
    trolleyId: string,
    toDate: string,
    adjustedPayment = 0,
  ): Promise<void> {
    const trolley = await trolleyRepository.findById(userId, trolleyId);
    if (!trolley) return;

    const updatedHistory = [...(trolley.history || [])];
    const last = updatedHistory[updatedHistory.length - 1];
    if (last) last.toDate = toDate;

    await trolleyRepository.update(userId, trolleyId, {
      isAvailable: true,
      currentClient: null,
      pending: Number(trolley.pending || 0) - adjustedPayment,
      history: updatedHistory,
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
