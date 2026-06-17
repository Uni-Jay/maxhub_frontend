import { apiClient } from './apiClient';
import type { StaffMember } from '@/types';

export interface StaffListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  departmentId?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeId?: string;
  departmentId: number;
  designationId?: number;
  locationId?: number;
  joiningDate: string;
  dateOfBirth: string;
  gender?: 'Male' | 'Female' | 'Other';
  status?: string;
  // Position & business unit
  position?: string;
  customPosition?: string;
  businessUnit?: string;
  additionalUnits?: string[];
}

export type UpdateStaffPayload = Partial<CreateStaffPayload>;

export const staffService = {
  getAll: (params: StaffListParams = {}) =>
    apiClient.getRaw(`/staff`, params) as Promise<{
      data: StaffMember[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getById: (id: number | string) =>
    apiClient.get<StaffMember>(`/staff/${id}`),

  create: (payload: CreateStaffPayload) =>
    apiClient.post<StaffMember>('/staff', payload),

  update: (id: number | string, payload: UpdateStaffPayload) =>
    apiClient.patch<StaffMember>(`/staff/${id}`, payload),

  remove: (id: number | string) =>
    apiClient.delete<null>(`/staff/${id}`),

  getQualifications: (id: number | string) =>
    apiClient.get<unknown[]>(`/staff/${id}/qualifications`),

  getSkills: (id: number | string) =>
    apiClient.get<unknown[]>(`/staff/${id}/skills`),

  getDocuments: (id: number | string) =>
    apiClient.get<unknown[]>(`/staff/${id}/documents`),
};
