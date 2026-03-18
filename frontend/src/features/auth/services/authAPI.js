import api from '@/lib/axios';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
};

export const seedAPI = {
  seed: () => api.post('/seed'),
};
