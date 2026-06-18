import { apiClient } from './apiClient';
import { BUSINESS_UNIT_LABELS, type BusinessUnitCode } from './hrService';

export interface Broadcast {
  id: number;
  uuid: string;
  title: string;
  message: string;
  audienceType: 'All' | 'BusinessUnit' | 'Department';
  audienceValue?: string;
  createdById: number;
  createdAt: string;
}

export { BUSINESS_UNIT_LABELS };
export type { BusinessUnitCode };

export const broadcastService = {
  getAll: () => apiClient.get<Broadcast[]>('/broadcasts'),

  create: (payload: { title: string; message: string; audienceType: 'All' | 'BusinessUnit' | 'Department'; audienceValue?: string }) =>
    apiClient.post<Broadcast & { recipientCount: number }>('/broadcasts', payload),

  remove: (id: number | string) => apiClient.delete<null>(`/broadcasts/${id}`),
};
