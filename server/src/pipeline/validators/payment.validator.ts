import { AppError } from '../middleware/error.middleware';

export function validatePayment(data: any): void {
  if (!data?.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
    throw new AppError(400, 'Valid positive amount is required');
  }
  if (!data?.date) throw new AppError(400, 'Payment date is required');
}
