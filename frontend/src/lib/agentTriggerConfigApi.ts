import { api } from './api';

const base = '/agent-trigger-config';

export type AgentTriggerConfigDto = {
  apiUrl: string;
  tokenConfigured: boolean;
  /** Stored webhook payload message (may be empty → server uses built-in default) */
  message: string;
  token: string;
  updatedAt: string | null;
};

export const agentTriggerConfigApi = {
  get: () => api.get<AgentTriggerConfigDto>(base),
  put: (body: { apiUrl: string; triggerToken?: string; message: string }) =>
    api.put<AgentTriggerConfigDto>(base, body),
};
