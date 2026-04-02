import { api } from './api';

const base = '/agent-trigger-config';

export type AgentTriggerConfigDto = {
  apiUrl: string;
  tokenConfigured: boolean;
  /** Stored Authorization header value (returned so you can verify it in the UI) */
  token: string;
  /** Stored webhook payload message (may be empty → server uses built-in default) */
  message: string;
  updatedAt: string | null;
};

export const agentTriggerConfigApi = {
  get: () => api.get<AgentTriggerConfigDto>(base),
  put: (body: { apiUrl: string; triggerToken?: string; message: string }) =>
    api.put<AgentTriggerConfigDto>(base, body),
};
