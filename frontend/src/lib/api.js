import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

// Productos API
export const productosAPI = {
  getAll: (params) => api.get('/productos', { params }),
  getById: (id) => api.get(`/productos/${id}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  delete: (id) => api.delete(`/productos/${id}`),
};

// Clientes API
export const clientesAPI = {
  getAll: (params) => api.get('/clientes', { params }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`),
};

// Proveedores API
export const proveedoresAPI = {
  getAll: (params) => api.get('/proveedores', { params }),
  getById: (id) => api.get(`/proveedores/${id}`),
  create: (data) => api.post('/proveedores', data),
  update: (id, data) => api.put(`/proveedores/${id}`, data),
  delete: (id) => api.delete(`/proveedores/${id}`),
};

// Ventas API
export const ventasAPI = {
  getAll: (params) => api.get('/ventas', { params }),
  getById: (id) => api.get(`/ventas/${id}`),
  create: (data) => api.post('/ventas', data),
  getPDF: (id) => api.get(`/ventas/${id}/pdf`, { responseType: 'blob' }),
};

// Inventario API
export const inventarioAPI = {
  getMovimientos: (params) => api.get('/inventario/movimientos', { params }),
  registrarEntrada: (data) => api.post('/inventario/entrada', data),
  registrarSalida: (data) => api.post('/inventario/salida', data),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getVentasRecientes: () => api.get('/dashboard/ventas-recientes'),
  getProductosTop: () => api.get('/dashboard/productos-top'),
  getVentasPorPeriodo: (dias) => api.get('/dashboard/ventas-por-periodo', { params: { dias } }),
};

// Reportes API
export const reportesAPI = {
  exportarVentasExcel: (data) => api.post('/reportes/ventas/excel', data, { responseType: 'blob' }),
  exportarInventarioExcel: () => api.get('/reportes/inventario/excel', { responseType: 'blob' }),
  exportarClientesExcel: () => api.get('/reportes/clientes/excel', { responseType: 'blob' }),
  getRentabilidad: () => api.get('/reportes/rentabilidad'),
  getVentasPorCategoria: () => api.get('/reportes/ventas-por-categoria'),
  getVentasPorVendedor: () => api.get('/reportes/ventas-por-vendedor'),
};

// Seed API
export const seedAPI = {
  seed: () => api.post('/seed'),
};

export default api;
