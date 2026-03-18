import api from '@/lib/axios';

export const inventarioAPI = {
  getMovimientos: (params) => api.get('/inventario/movimientos', { params }),
  registrarEntrada: (data) => api.post('/inventario/entrada', data),
  registrarSalida: (data) => api.post('/inventario/salida', data),
};
