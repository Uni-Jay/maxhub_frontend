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
  /** Omit for a personal project — the backend self-assigns these when the caller lacks project.create.all. */
  departmentId?: number;
  projectManagerId?: number;
  startDate?: string;
  endDate?: string;
  expectedEndDate?: string;
  budget?: number;
  status?: string;
  priority?: string;
}

export type UpdateProjectPayload = Partial<CreateProjectPayload> & { progress?: number };

export interface ProjectComment {
  id: number;
  uuid: string;
  taskId?: number;
  projectId: number;
  staffId: number;
  content: string;
  createdAt: string;
  author?: { id: number; firstName: string; lastName: string };
}

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

  getComments: (id: number | string) =>
    apiClient.get<ProjectComment[]>(`/projects/${id}/comments`),

  addComment: (id: number | string, content: string) =>
    apiClient.post<ProjectComment>(`/projects/${id}/comments`, { content }),
};
