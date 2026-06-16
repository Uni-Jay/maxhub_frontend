import { apiClient } from './apiClient';

export interface ConversationParticipant {
  userId: number;
  user?: { id: number; firstName: string; lastName: string; avatar?: string; email?: string };
}

export interface ChatMessage {
  id: number; uuid: string; conversationId: number; senderUserId: number;
  messageText: string; messageType: 'Text' | 'Image' | 'File' | 'Link' | 'Emoji' | 'Mention';
  attachmentUrl?: string; replyToMessageId?: number;
  isEdited: boolean; editedAt?: string; isPinned: boolean;
  reactions?: any;
  sender?: { firstName: string; lastName: string; avatar?: string };
  replyTo?: ChatMessage;
  createdAt: string; updatedAt: string;
}

export interface Conversation {
  id: number; uuid: string; conversationCode: string; title: string;
  conversationType: 'Direct' | 'Group' | 'Team' | 'Channel';
  createdById: number; isArchived: boolean; lastMessageAt?: string;
  participants?: ConversationParticipant[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  createdAt: string;
}

export const messagingService = {
  getConversations: () => apiClient.get<Conversation[]>('/messages/conversations'),

  createConversation: (payload: { title: string; conversationType: string; participantUserIds: number[] }) =>
    apiClient.post<Conversation>('/messages/conversations', payload),

  getConversation: (id: number | string) =>
    apiClient.get<Conversation>(`/messages/conversations/${id}`),

  archiveConversation: (id: number | string) =>
    apiClient.patch<Conversation>(`/messages/conversations/${id}/archive`, {}),

  addParticipants: (conversationId: number | string, userIds: number[]) =>
    apiClient.post<Conversation>(`/messages/conversations/${conversationId}/participants`, { userIds }),

  removeParticipant: (conversationId: number | string, userId: number) =>
    apiClient.delete<null>(`/messages/conversations/${conversationId}/participants/${userId}`),

  getMessages: (conversationId: number | string, params: { page?: number; limit?: number } = {}) =>
    apiClient.getRaw(`/messages/conversations/${conversationId}/messages`, params) as Promise<{
      data: ChatMessage[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  sendMessage: (conversationId: number | string, payload: { messageText: string; messageType?: string; replyToMessageId?: number; attachmentUrl?: string }) =>
    apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/messages`, payload),

  editMessage: (conversationId: number | string, messageId: number | string, messageText: string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}`, { messageText }),

  deleteMessage: (conversationId: number | string, messageId: number | string) =>
    apiClient.delete<null>(`/messages/conversations/${conversationId}/messages/${messageId}`),

  pinMessage: (conversationId: number | string, messageId: number | string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}/pin`, {}),

  reactToMessage: (conversationId: number | string, messageId: number | string, emoji: string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}/react`, { emoji }),

  markAsRead: (conversationId: number | string) =>
    apiClient.post<null>(`/messages/conversations/${conversationId}/read`, {}),
};
