import api from '@/lib/axios';

export const reportesAPI = {
  exportarVentasExcel: (data) => api.post('/reportes/ventas/excel', data, { responseType: 'blob' }),
  exportarInventarioExcel: () => api.get('/reportes/inventario/excel', { responseType: 'blob' }),
  exportarClientesExcel: () => api.get('/reportes/clientes/excel', { responseType: 'blob' }),
  getRentabilidad: () => api.get('/reportes/rentabilidad'),
  getVentasPorCategoria: () => api.get('/reportes/ventas-por-categoria'),
  getVentasPorVendedor: () => api.get('/reportes/ventas-por-vendedor'),
};
