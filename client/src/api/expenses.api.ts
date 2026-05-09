import { api } from './index';

export const expensesApi = {
  add: (data: any) => api.post('/api/expenses', data),
  update: (id: string, data: any) => api.put(`/api/expenses/${id}`, data),
  remove: (id: string) => api.delete(`/api/expenses/${id}`),
};
