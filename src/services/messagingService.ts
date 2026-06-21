import { apiClient } from './apiClient';

export interface ConversationParticipant {
  userId: number;
  role: 'Admin' | 'Member' | 'Moderator' | 'Viewer';
  isMuted?: boolean;
  lastSeenAt?: string;
  user?: { id: number; firstName: string; lastName: string; avatar?: string; email?: string };
}

export interface ChatMessage {
  id: number; uuid: string; conversationId: number; senderUserId: number;
  messageText: string;
  messageType: 'Text' | 'Image' | 'File' | 'Link' | 'Emoji' | 'Mention' | 'Audio' | 'Video' | 'Voice';
  attachmentUrl?: string; attachmentType?: string;
  attachmentName?: string; attachmentSize?: number; attachmentDuration?: number;
  replyToMessageId?: number;
  isEdited: boolean; editedAt?: string; isPinned: boolean;
  reactions?: Record<string, number[]>;
  starredByUserIds?: number[];
  sender?: { id: number; firstName: string; lastName: string; avatar?: string };
  conversation?: { id: number; title: string; conversationType: string };
  replyTo?: ChatMessage;
  createdAt: string; updatedAt: string;
  tempId?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'seen';
}

export interface Conversation {
  id: number; uuid: string; conversationCode: string; title: string;
  conversationType: 'Direct' | 'Group' | 'Team' | 'Channel';
  createdById: number; isArchived: boolean; lastMessageAt?: string;
  participants?: ConversationParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  myRole?: 'Admin' | 'Member' | 'Moderator' | 'Viewer';
  isMuted?: boolean;
  createdAt: string;
}

export interface ChatUser {
  id: number; firstName: string; lastName: string; email: string; avatar?: string;
}

export const messagingService = {
  // ── User Search ──────────────────────────────────────────────────────────
  searchUsers: (q: string, limit = 20) =>
    apiClient.get<ChatUser[]>(`/messages/users/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getOnlineUsers: () =>
    apiClient.get<{ onlineUserIds: number[] }>('/messages/users/online'),

  // ── Conversations ─────────────────────────────────────────────────────────
  getConversations: () =>
    apiClient.get<Conversation[]>('/messages/conversations'),

  createConversation: (payload: { title: string; conversationType: string; participantUserIds: number[]; description?: string }) =>
    apiClient.post<Conversation>('/messages/conversations', payload),

  findOrCreateDM: (userId: number) =>
    apiClient.post<Conversation & { isNew: boolean }>('/messages/conversations/find-or-create', { userId }),

  getConversation: (id: number | string) =>
    apiClient.get<Conversation>(`/messages/conversations/${id}`),

  renameGroup: (id: number | string, title: string) =>
    apiClient.patch<Conversation>(`/messages/conversations/${id}`, { title }),

  archiveConversation: (id: number | string) =>
    apiClient.patch<Conversation>(`/messages/conversations/${id}/archive`, {}),

  muteConversation: (id: number | string) =>
    apiClient.patch<ConversationParticipant>(`/messages/conversations/${id}/mute`, {}),

  deleteConversation: (id: number | string) =>
    apiClient.delete<null>(`/messages/conversations/${id}`),

  addParticipants: (conversationId: number | string, userIds: number[]) =>
    apiClient.post<null>(`/messages/conversations/${conversationId}/participants`, { userIds }),

  removeParticipant: (conversationId: number | string, userId: number) =>
    apiClient.delete<null>(`/messages/conversations/${conversationId}/participants/${userId}`),

  // ── Messages ──────────────────────────────────────────────────────────────
  getMessages: (conversationId: number | string, params: { page?: number; limit?: number; before?: string } = {}) =>
    apiClient.getRaw(`/messages/conversations/${conversationId}/messages`, params) as Promise<{
      data: ChatMessage[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>,

  sendMessage: (conversationId: number | string, payload: {
    messageText: string; messageType?: string;
    replyToMessageId?: number; attachmentUrl?: string; attachmentType?: string;
    attachmentName?: string; attachmentSize?: number; attachmentDuration?: number;
  }) =>
    apiClient.post<ChatMessage>(`/messages/conversations/${conversationId}/messages`, payload),

  editMessage: (conversationId: number | string, messageId: number | string, messageText: string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}`, { messageText }),

  deleteMessage: (conversationId: number | string, messageId: number | string, deleteForEveryone = false) =>
    apiClient.delete<null>(`/messages/conversations/${conversationId}/messages/${messageId}${deleteForEveryone ? '?everyone=true' : ''}`),

  pinMessage: (conversationId: number | string, messageId: number | string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}/pin`, {}),

  starMessage: (conversationId: number | string, messageId: number | string) =>
    apiClient.patch<{ messageId: number; isStarred: boolean }>(`/messages/conversations/${conversationId}/messages/${messageId}/star`, {}),

  getStarredMessages: () =>
    apiClient.get<ChatMessage[]>('/messages/starred'),

  reactToMessage: (conversationId: number | string, messageId: number | string, emoji: string) =>
    apiClient.patch<ChatMessage>(`/messages/conversations/${conversationId}/messages/${messageId}/react`, { emoji }),

  forwardMessage: (conversationId: number | string, messageId: number | string, targetConversationIds: number[]) =>
    apiClient.post<ChatMessage[]>(`/messages/conversations/${conversationId}/messages/${messageId}/forward`, { targetConversationIds }),

  markAsRead: (conversationId: number | string) =>
    apiClient.post<null>(`/messages/conversations/${conversationId}/read`, {}),

  getPinnedMessages: (conversationId: number | string) =>
    apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}/pinned`),

  getConversationMedia: (conversationId: number | string, type?: 'images' | 'files') =>
    apiClient.get<ChatMessage[]>(`/messages/conversations/${conversationId}/media${type ? `?type=${type}` : ''}`),

  // ── Search ────────────────────────────────────────────────────────────────
  searchMessages: (q: string) =>
    apiClient.get<ChatMessage[]>(`/messages/search?q=${encodeURIComponent(q)}`),
};
