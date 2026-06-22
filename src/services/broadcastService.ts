import { apiClient } from './apiClient';
import { BUSINESS_UNIT_LABELS, type BusinessUnitCode } from './hrService';

export interface Broadcast {
  id: number;
  uuid: string;
  title: string;
  message: string;
  audienceType: 'All' | 'BusinessUnit' | 'Department' | 'Role';
  audienceValue?: string;
  createdById: number;
  createdAt: string;
}

export const ROLE_AUDIENCE_LABELS: Record<string, string> = {
  staff: 'All Staff',
  hod: 'All HODs',
  hr: 'All HR',
  admin: 'All Admins',
  superadmin: 'All Super Admins',
};

export { BUSINESS_UNIT_LABELS };
export type { BusinessUnitCode };

export const broadcastService = {
  getAll: () => apiClient.get<Broadcast[]>('/broadcasts'),

  create: (payload: { title: string; message: string; audienceType: 'All' | 'BusinessUnit' | 'Department' | 'Role'; audienceValue?: string }) =>
    apiClient.post<Broadcast & { recipientCount: number }>('/broadcasts', payload),

  remove: (id: number | string) => apiClient.delete<null>(`/broadcasts/${id}`),
};
