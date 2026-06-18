import { apiClient } from './apiClient';
import type { ProjectItem } from '@/types';

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  departmentId?: number;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  projectCode?: string;
  departmentId: number;
  projectManagerId: number;
  startDate: string;
  endDate?: string;
  expectedEndDate?: string;
  budget?: number;
  status?: string;
  priority?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & { progress?: number };

export const projectService = {
  getAll: (params: ProjectListParams = {}) =>
    apiClient.getRaw('/projects', params) as Promise<{
      data: ProjectItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getById: (id: number | string) =>
    apiClient.get<ProjectItem>(`/projects/${id}`),

  create: (payload: CreateProjectPayload) =>
    apiClient.post<ProjectItem>('/projects', payload),

  update: (id: number | string, payload: UpdateProjectPayload) =>
    apiClient.patch<ProjectItem>(`/projects/${id}`, payload),

  remove: (id: number | string) =>
    apiClient.delete<null>(`/projects/${id}`),

  getTasks: (id: number | string) =>
    apiClient.get<unknown[]>(`/projects/${id}/tasks`),

  getMilestones: (id: number | string) =>
    apiClient.get<unknown[]>(`/projects/${id}/milestones`),

  getTeam: (id: number | string) =>
    apiClient.get<unknown[]>(`/projects/${id}/team`),
};
