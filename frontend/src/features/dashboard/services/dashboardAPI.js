import api from '@/lib/axios';

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getVentasRecientes: () => api.get('/dashboard/ventas-recientes'),
  getProductosTop: () => api.get('/dashboard/productos-top'),
  getVentasPorPeriodo: (dias) => api.get('/dashboard/ventas-por-periodo', { params: { dias } }),
};
