import { api } from './api';
import type { ProcessingJob, ProcessingJobListResponse } from '@/types/processingJob';

export async function fetchProcessingJob(id: string) {
  const { data } = await api.get<ProcessingJob>(`/processing-jobs/${id}`);
  return data;
}

export async function fetchProcessingJobs(params?: { limit?: number; skip?: number }) {
  const { data } = await api.get<ProcessingJobListResponse>('/processing-jobs', {
    params,
  });
  return data;
}
