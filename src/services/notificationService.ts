import { apiClient } from './apiClient';

export interface Notification {
  id: number; uuid: string; recipientUserId: number;
  notificationType: 'Message' | 'Mention' | 'Assignment' | 'Leave' | 'Payroll' | 'System' | 'Alert' | 'Other';
  title: string; message: string; relatedEntityType?: string;
  relatedEntityId?: number; actionUrl?: string;
  isRead: boolean; readAt?: string;
  deliveryChannel: 'InApp' | 'Email' | 'SMS' | 'Push';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  createdAt: string;
}

export interface NotificationListParams {
  page?: number; limit?: number; isRead?: boolean;
  notificationType?: string; priority?: string;
}

export const notificationService = {
  getAll: (params: NotificationListParams = {}) =>
    apiClient.getRaw('/notifications', params) as Promise<{
      data: Notification[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  getUnreadCount: () => apiClient.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: number | string) =>
    apiClient.patch<Notification>(`/notifications/${id}/read`, {}),

  markAllRead: () => apiClient.post<{ updated: number }>('/notifications/mark-all-read', {}),

  remove: (id: number | string) => apiClient.delete<null>(`/notifications/${id}`),

  create: (payload: {
    recipientUserId: number; notificationType: string; title: string;
    message: string; actionUrl?: string; priority?: string; deliveryChannel?: string;
  }) => apiClient.post<Notification>('/notifications', payload),
};
