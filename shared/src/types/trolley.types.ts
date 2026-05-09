export interface TrolleyHistory {
  action: string;
  clientName?: string;
  clientId?: string;
  date: string;
  fromDate?: string;
  toDate?: string | null;
  amount?: number;
  description?: string;
}

export interface Trolley {
  id: string;
  isAvailable: boolean;
  currentClient: string | null;
  currentClientId?: string | null;
  pending: number;
  history: TrolleyHistory[];
}
