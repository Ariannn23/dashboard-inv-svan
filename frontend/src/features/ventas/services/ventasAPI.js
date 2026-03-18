import api from '@/lib/axios';

export const ventasAPI = {
  getAll: (params) => api.get('/ventas', { params }),
  getById: (id) => api.get(`/ventas/${id}`),
  create: (data) => api.post('/ventas', data),
  getPDF: (id) => api.get(`/ventas/${id}/pdf`, { responseType: 'blob' }),
};
