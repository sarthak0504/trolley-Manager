import { api } from './index';

export const trolleysApi = {
  create: (data: { id: string }) => api.post('/api/trolleys', data),
  toggle: (id: string) => api.patch(`/api/trolleys/${id}/toggle`),
  assign: (id: string, data: { clientId: string; clientName: string }) =>
    api.patch(`/api/trolleys/${id}/assign`, data),
  markReturned: (id: string, data: { toDate: string; adjustedPayment?: number }) =>
    api.patch(`/api/trolleys/${id}/return`, data),
  updateHistory: (clientId: string, data: { newName: string; newStartDate?: string }) =>
    api.patch(`/api/trolleys/history/${clientId}`, data),
};
