import { AppError } from '../middleware/error.middleware';

export function validateCreateTrolley(data: any): void {
  if (!data?.id?.trim()) throw new AppError(400, 'Trolley ID is required');
}

export function validateAssignTrolley(data: any): void {
  if (!data?.clientId) throw new AppError(400, 'Client ID is required');
  if (!data?.clientName?.trim()) throw new AppError(400, 'Client name is required');
}

export function validateMarkReturned(data: any): void {
  if (!data?.toDate) throw new AppError(400, 'Return date is required');
}
