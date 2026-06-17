import { apiClient } from './apiClient';
import type { LeaveRequestItem, LeaveBalance, LeaveType } from '@/types';

export interface LeaveRequestParams {
  page?: number;
  limit?: number;
  status?: string;
  staffId?: number;
  search?: string;
}

export interface CreateLeavePayload {
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
}

export const leaveService = {
  getRequests: (params: LeaveRequestParams = {}) =>
    apiClient.getRaw('/leave/requests', params) as Promise<{
      data: LeaveRequestItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getRequestById: (id: number | string) =>
    apiClient.get<LeaveRequestItem>(`/leave/requests/${id}`),

  createRequest: (payload: CreateLeavePayload) =>
    apiClient.post<LeaveRequestItem>('/leave/requests', payload),

  approve: (id: number | string, comments?: string) =>
    apiClient.patch<LeaveRequestItem>(`/leave/requests/${id}/approve`, { comments }),

  reject: (id: number | string, comments?: string) =>
    apiClient.patch<LeaveRequestItem>(`/leave/requests/${id}/reject`, { comments }),

  getBalance: () =>
    apiClient.get<{ total: number; used: number; available: number; leaveTypes: LeaveBalance[] }>('/leave/balance'),

  getTypes: () =>
    apiClient.get<LeaveType[]>('/leave/types'),
};
