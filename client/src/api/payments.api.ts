import { api } from './index';

export const paymentsApi = {
  add: (clientId: string, data: any) =>
    api.post(`/api/clients/${clientId}/payments`, data),
  update: (clientId: string, paymentId: string, data: any, oldAmount: number) =>
    api.put(`/api/clients/${clientId}/payments/${paymentId}`, { ...data, oldAmount }),
  remove: (clientId: string, paymentId: string, amount: number) =>
    api.delete(`/api/clients/${clientId}/payments/${paymentId}`, { data: { amount } }),
};
