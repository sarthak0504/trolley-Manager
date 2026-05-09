import { AppError } from '../middleware/error.middleware';

export function validateCreateClient(data: any): void {
  if (!data?.name?.trim()) throw new AppError(400, 'Client name is required');
  if (!data?.activeRentals?.length) throw new AppError(400, 'At least one rental is required');
  const rental = data.activeRentals[0];
  if (!rental?.trolleyNo) throw new AppError(400, 'Trolley number is required');
  if (!rental?.startDate) throw new AppError(400, 'Rent start date is required');
  if (!rental?.monthlyRent || isNaN(Number(rental.monthlyRent))) {
    throw new AppError(400, 'Valid monthly rent is required');
  }
}

export function validateUpdateClient(data: any): void {
  if (data?.activeRentals !== undefined && !Array.isArray(data.activeRentals)) {
    throw new AppError(400, 'activeRentals must be an array');
  }
}

export function validateEditRentCycle(data: any): void {
  if (!data?.trolleyNo) throw new AppError(400, 'Trolley number is required');
  if (!data?.cycleDateStr) throw new AppError(400, 'Cycle date is required');
  if (data?.newRentAmount === undefined || isNaN(Number(data.newRentAmount))) {
    throw new AppError(400, 'Valid rent amount is required');
  }
}
