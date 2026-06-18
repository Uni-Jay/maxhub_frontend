import { apiClient } from './apiClient';
import type { TaskItem } from '@/types';

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  projectId?: number;
  assigneeId?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  taskCode?: string;
  /** Omit for a personal task — the backend self-assigns it when the caller lacks task.create.all. */
  projectId?: number;
  assigneeId?: number;
  priority?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  label?: string;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload> & {
  progress?: number;
  actualHours?: number;
};

export interface TaskComment {
  id: number;
  uuid: string;
  taskId: number;
  projectId?: number;
  staffId: number;
  content: string;
  createdAt: string;
  author?: { id: number; firstName: string; lastName: string };
}

export const taskService = {
  getAll: (params: TaskListParams = {}) =>
    apiClient.getRaw('/tasks', params) as Promise<{
      data: TaskItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getById: (id: number | string) =>
    apiClient.get<TaskItem>(`/tasks/${id}`),

  create: (payload: CreateTaskPayload) =>
    apiClient.post<TaskItem>('/tasks', payload),

  update: (id: number | string, payload: UpdateTaskPayload) =>
    apiClient.patch<TaskItem>(`/tasks/${id}`, payload),

  updateStatus: (id: number | string, status: string) =>
    apiClient.patch<TaskItem>(`/tasks/${id}/status`, { status }),

  assign: (id: number | string, assigneeId: number) =>
    apiClient.patch<TaskItem>(`/tasks/${id}/assign`, { assigneeId }),

  remove: (id: number | string) =>
    apiClient.delete<null>(`/tasks/${id}`),

  getComments: (id: number | string) =>
    apiClient.get<TaskComment[]>(`/tasks/${id}/comments`),

  addComment: (id: number | string, content: string) =>
    apiClient.post<TaskComment>(`/tasks/${id}/comments`, { content }),
};
