export type ProcessingJobStatus = 'processing' | 'completed' | 'failed';

export interface UploadedFileMeta {
  originalname: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface ProcessingJob {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  notificationEmail: string;
  status: ProcessingJobStatus;
  uploadedFiles: UploadedFileMeta[];
  resultPdfUrl: string | null;
  resultXlsxUrl: string | null;
  errorMessage: string;
  webhookTriggered: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ProcessingJobListResponse {
  jobs: ProcessingJob[];
  total: number;
  limit: number;
  skip: number;
}

export interface UploadResponse {
  ok: boolean;
  job: {
    id: string;
    eventId: string;
    status: ProcessingJobStatus;
  };
}
