import { Expense } from '@trolley/shared';
import { expenseRepository } from '../repositories/expense.repository';
import { trolleyRepository } from '../repositories/trolley.repository';

async function syncTrolleyHistory(
  userId: string,
  trolleyNo: string,
  action: 'Add' | 'Delete',
  description: string,
  amount: number,
  date: string,
): Promise<void> {
  if (!trolleyNo) return;

  const trolley = await trolleyRepository.findById(userId, trolleyNo);
  if (!trolley) return;

  const filtered = (trolley.history || []).filter(
    (h) =>
      !(
        h.action === 'Expense' &&
        h.description === description &&
        h.amount === amount &&
        h.date === date
      ),
  );

  const updatedHistory =
    action === 'Delete'
      ? filtered
      : [...filtered, { action: 'Expense', description, amount, date }];

  await trolleyRepository.update(userId, trolleyNo, { history: updatedHistory });
}

export const expenseService = {
  async addExpense(userId: string, input: any): Promise<Expense> {
    const created = await expenseRepository.create(userId, { ...input, userId });

    if (input.trolleyNo) {
      await syncTrolleyHistory(userId, input.trolleyNo, 'Add', input.work, input.amount, input.date);
    }

    return created;
  },

  async updateExpense(userId: string, expenseId: string, newDetails: any): Promise<void> {
    const old = await expenseRepository.findById(userId, expenseId);
    if (!old) return;

    await expenseRepository.update(userId, expenseId, newDetails);

    if (old.trolleyNo) {
      await syncTrolleyHistory(userId, old.trolleyNo, 'Delete', old.work, old.amount, old.date);
    }
    if (newDetails.trolleyNo) {
      await syncTrolleyHistory(
        userId,
        newDetails.trolleyNo,
        'Add',
        newDetails.work,
        newDetails.amount,
        newDetails.date,
      );
    }
  },

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const expense = await expenseRepository.findById(userId, expenseId);
    if (!expense) return;

    await expenseRepository.delete(userId, expenseId);

    if (expense.trolleyNo) {
      await syncTrolleyHistory(
        userId,
        expense.trolleyNo,
        'Delete',
        expense.work,
        expense.amount,
        expense.date,
      );
    }
  },
};
