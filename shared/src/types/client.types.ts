export interface RentHistory {
  effectiveDate: string;
  amount: number;
}

export interface ActiveRental {
  trolleyNo: string;
  startDate: string;
  monthlyRent: number;
  pending: number;
  nextRentDueDate: string;
  lastRentAddedOn: string;
  rentHistory: RentHistory[];
}

export interface PastRental extends ActiveRental {
  returnedOn: string;
  rentStartDate: string;
  billingCycleStart: string;
  rentEndDate: string;
  daysUsedThisMonth: number;
  pendingTillLastMonth: number;
  currentMonthPending: number;
  adjustPayment: number;
  finalPending: number;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  jamamnatDaar?: string;
  jamanatPhone?: string;
  activeRentals: ActiveRental[];
  pastRentals: PastRental[];
  pendingAmount: number;
  advance: number;
  initialAdvance: number;
  totalPaidAmount: number;
}

export type CreateClientInput = Omit<Client, 'id' | 'userId' | 'pendingAmount' | 'totalPaidAmount'>;
export type UpdateClientInput = Partial<Omit<Client, 'id' | 'userId'>>;
