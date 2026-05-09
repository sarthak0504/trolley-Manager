export interface Expense {
  id: string;
  userId: string;
  work: string;
  amount: number;
  date: string;
  trolleyNo?: string;
}

export type CreateExpenseInput = Omit<Expense, 'id' | 'userId'>;
export type UpdateExpenseInput = Partial<CreateExpenseInput>;
