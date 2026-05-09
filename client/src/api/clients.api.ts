import { api } from './index';

export const clientsApi = {
  create: (data: any) => api.post('/api/clients', data),
  update: (id: string, data: any) => api.put(`/api/clients/${id}`, data),
  remove: (id: string) => api.delete(`/api/clients/${id}`),
  syncRent: (id: string) => api.post(`/api/clients/${id}/sync-rent`),
  editRentHistory: (id: string, data: any) =>
    api.post(`/api/clients/${id}/rent-history`, data),
};
