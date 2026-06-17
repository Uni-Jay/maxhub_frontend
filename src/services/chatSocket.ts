import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  : 'http://localhost:3000';

class ChatSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected && this.token === token) return this.socket;

    this.disconnect();
    this.token = token;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[Chat] Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[Chat] Socket connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
  }

  get instance(): Socket | null {
    return this.socket;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Emit helpers ──────────────────────────────────────────────────────────

  joinConversation(conversationId: number) {
    this.socket?.emit('chat:join', { conversationId });
  }

  sendMessage(data: {
    conversationId: number;
    messageText: string;
    messageType?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    replyToMessageId?: number;
    tempId?: string;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:send', data, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  typingStart(conversationId: number) {
    this.socket?.emit('chat:typing_start', { conversationId });
  }

  typingStop(conversationId: number) {
    this.socket?.emit('chat:typing_stop', { conversationId });
  }

  editMessage(messageId: number, messageText: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:edit', { messageId, messageText }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  deleteMessage(messageId: number, deleteForEveryone = false): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:delete', { messageId, deleteForEveryone }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  reactToMessage(messageId: number, emoji: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:react', { messageId, emoji }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  pinMessage(messageId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:pin', { messageId }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  markRead(conversationId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('chat:read', { conversationId }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  // ── WebRTC Call Signaling ─────────────────────────────────────────────────

  initiateCall(data: {
    calleeUserId: number;
    callType: 'Voice' | 'Video';
    conversationId?: number;
    offer: RTCSessionDescriptionInit;
  }): Promise<{ callId: number; roomName: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('call:initiate', data, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  answerCall(callId: number, answer: RTCSessionDescriptionInit): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('call:answer', { callId, answer }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  rejectCall(callId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('call:reject', { callId }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  endCall(callId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Socket not connected'));
      this.socket.emit('call:end', { callId }, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  sendIceCandidate(targetUserId: number, callId: number, candidate: RTCIceCandidateInit) {
    this.socket?.emit('call:ice_candidate', { targetUserId, callId, candidate });
  }

  // ── On helpers ────────────────────────────────────────────────────────────

  on(event: string, handler: (...args: any[]) => void) {
    this.socket?.on(event, handler);
    return () => this.socket?.off(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    this.socket?.off(event, handler);
  }
}

export const chatSocket = new ChatSocketService();
