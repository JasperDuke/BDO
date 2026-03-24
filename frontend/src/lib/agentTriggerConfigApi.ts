import { api } from './api';

const base = '/agent-trigger-config';

export type AgentTriggerConfigDto = {
  apiUrl: string;
  tokenConfigured: boolean;
};

export const agentTriggerConfigApi = {
  get: () => api.get<AgentTriggerConfigDto>(base),
  put: (body: { apiUrl: string; triggerToken?: string }) =>
    api.put<AgentTriggerConfigDto>(base, body),
};
