import api from '@/lib/axios';

export const comprasAPI = {
  getAll: (params) => api.get('/compras', { params }),
  getById: (id) => api.get(`/compras/${id}`),
  create: (data) => api.post('/compras', data),
  recibir: (id) => api.post(`/compras/${id}/recibir`),
  cancelar: (id) => api.post(`/compras/${id}/cancelar`),
  delete: (id) => api.delete(`/compras/${id}`),
  getStats: () => api.get('/compras/stats/resumen'),
};
