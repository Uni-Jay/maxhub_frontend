import { apiClient } from './apiClient';

export interface Unit {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  branchId?: number;
  branch?: { id: number; uuid: string; branchCode: string; branchName: string };
  headUserId?: number;
  head?: { id: number; firstName: string; lastName: string; email: string };
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface UnitListParams {
  page?: number;
  limit?: number;
  branchId?: number;
  status?: string;
  search?: string;
}

export const unitService = {
  getAll: (params: UnitListParams = {}) =>
    apiClient.getRaw('/units', params) as Promise<{
      data: Unit[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getById: (id: number | string) => apiClient.get<Unit>(`/units/${id}`),

  create: (payload: { name: string; code: string; description?: string; branchId?: number; headUserId?: number; status?: string }) =>
    apiClient.post<Unit>('/units', payload),

  update: (id: number | string, payload: Partial<Unit>) =>
    apiClient.patch<Unit>(`/units/${id}`, payload),

  remove: (id: number | string) => apiClient.delete<null>(`/units/${id}`),
};
