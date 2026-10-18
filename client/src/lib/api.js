import axios from 'axios';
import { API_URL, TOKEN_KEY } from './config';

export const http = axios.create({ baseURL: API_URL, timeout: 15000 });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Human-readable message from any failed request. */
export const errMsg = (e) =>
  e?.response?.data?.error?.message ||
  (e?.code === 'ECONNABORTED' ? 'The server took too long to respond.' : e?.request && !e?.response ? 'Cannot reach the server. Check your connection.' : e?.message) ||
  'Something went wrong';

/** Field-level validation errors as { field: message } (from the server's 400 response). */
export const errFields = (e) => {
  const out = {};
  for (const d of e?.response?.data?.error?.details || []) if (d.field) out[d.field] = d.message;
  return out;
};

export const authApi = {
  login: (email, password) => http.post('/auth/login', { email, password }).then((r) => r.data),
};

export const eventsApi = {
  list: (params) => http.get('/events', { params }).then((r) => r.data),
  locations: () => http.get('/events/locations').then((r) => r.data.data),
  get: (id) => http.get(`/events/${id}`).then((r) => r.data.data),
  create: (body) => http.post('/events', body).then((r) => r.data.data),
  update: (id, body) => http.put(`/events/${id}`, body).then((r) => r.data.data),
  remove: (id) => http.delete(`/events/${id}`).then((r) => r.data),
};

export const bookingsApi = {
  create: (body) => http.post('/bookings', body).then((r) => r.data.data),
  list: (params) => http.get('/bookings', { params }).then((r) => r.data.data),
  cancel: (id) => http.patch(`/bookings/${id}/cancel`).then((r) => r.data.data),
};

export const ticketsApi = {
  get: (code) => http.get(`/tickets/${code}`).then((r) => r.data.data),
  verify: (code) => http.post(`/tickets/${code}/verify`).then((r) => r.data),
};
