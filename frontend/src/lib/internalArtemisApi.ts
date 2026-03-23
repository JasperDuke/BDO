import { api } from './api';

const base = '/internal/artemis';

export const internalArtemisApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get(base, { params }),
  get: (id: string) => api.get(`${base}/${id}`),
  create: (body: unknown) => api.post(base, body),
  update: (id: string, body: unknown) => api.put(`${base}/${id}`, body),
  remove: (id: string) => api.delete(`${base}/${id}`),
};
