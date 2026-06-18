import { apiClient } from './apiClient';

export interface Branch {
  id: number;
  uuid: string;
  branchCode: string;
  branchName: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  managerId?: number;
  manager?: { id: number; firstName: string; lastName: string; email: string };
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface BranchListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const branchService = {
  getAll: (params: BranchListParams = {}) =>
    apiClient.getRaw('/branches', params) as Promise<{
      data: Branch[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getById: (id: number | string) => apiClient.get<Branch>(`/branches/${id}`),

  create: (payload: { branchCode: string; branchName: string; country?: string; state?: string; city?: string; address?: string; phone?: string; email?: string; managerId?: number; status?: string }) =>
    apiClient.post<Branch>('/branches', payload),

  update: (id: number | string, payload: Partial<Branch>) =>
    apiClient.patch<Branch>(`/branches/${id}`, payload),

  remove: (id: number | string) => apiClient.delete<null>(`/branches/${id}`),
};
