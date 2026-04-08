import { api } from './api';

const base = '/internal/artemis';

export type ArtemisBulkImportResult = {
  created: unknown[];
  errors: { index: number; message: string }[];
  count: number;
};

export const internalArtemisApi = {
  list: (params?: Record<string, string | number | undefined>) => api.get(base, { params }),
  get: (id: string) => api.get(`${base}/${id}`),
  create: (body: unknown) => api.post(base, body),
  createBulk: (items: unknown[]) =>
    api.post<ArtemisBulkImportResult>(`${base}/bulk`, items),
  update: (id: string, body: unknown) => api.put(`${base}/${id}`, body),
  remove: (id: string) => api.delete(`${base}/${id}`),
};
