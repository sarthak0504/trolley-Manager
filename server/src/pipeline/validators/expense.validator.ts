import { AppError } from '../middleware/error.middleware';

export function validateExpense(data: any): void {
  if (!data?.work?.trim()) throw new AppError(400, 'Work description is required');
  if (!data?.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    throw new AppError(400, 'Valid positive amount is required');
  }
  if (!data?.date) throw new AppError(400, 'Expense date is required');
}
