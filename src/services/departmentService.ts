import { apiClient } from './apiClient';

export interface Department {
  id: number;
  name: string;
  code: string;
  status: string;
}

export interface Designation {
  id: number;
  name: string;
  code: string;
  level: number;
  departmentId?: number;
}

export const departmentService = {
  getAll: () => apiClient.get<Department[]>('/departments'),
  getById: (id: number | string) => apiClient.get<Department>(`/departments/${id}`),
  create: (payload: { name: string; code?: string; parentDepartmentId?: number; headUserId?: number }) =>
    apiClient.post<Department>('/departments', payload),
  update: (id: number | string, payload: Partial<{ name: string; code: string; status: string; headUserId?: number }>) =>
    apiClient.patch<Department>(`/departments/${id}`, payload),
  remove: (id: number | string) => apiClient.delete<null>(`/departments/${id}`),
};

export const designationService = {
  getAll: (departmentId?: number) =>
    apiClient.get<Designation[]>('/designations', departmentId ? { departmentId } : undefined),
  getById: (id: number | string) => apiClient.get<Designation>(`/designations/${id}`),
  create: (payload: { name: string; code?: string; departmentId?: number; level?: number; baseSalary?: number; description?: string }) =>
    apiClient.post<Designation>('/designations', payload),
  update: (id: number | string, payload: Partial<{ name: string; code: string; departmentId: number; level: number; status: string }>) =>
    apiClient.patch<Designation>(`/designations/${id}`, payload),
  remove: (id: number | string) => apiClient.delete<null>(`/designations/${id}`),
};
