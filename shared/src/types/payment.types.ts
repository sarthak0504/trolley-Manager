export type PaymentType = 'manual' | 'advance_manual' | 'rent_auto';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  type: PaymentType;
  notes?: string;
}

export type CreatePaymentInput = Omit<Payment, 'id'>;
export type UpdatePaymentInput = Partial<Omit<Payment, 'id'>>;
