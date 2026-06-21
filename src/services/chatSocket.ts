import { io, Socket } from 'socket.io-client';

// Was reading VITE_API_BASE_URL, a name that's never actually defined in any
// .env file (the real var is VITE_API_URL, same as apiClient.ts uses) — so
// this always silently fell through to the localhost fallback. In
// production that meant every browser tried to open a socket to its own
// machine's localhost:3000 instead of the real backend, so chat could never
// connect for an actual deployed user.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_REACT_APP_API_URL ||
  import.meta.env.VITE_APP_API_URL ||
  'http://localhost:3000/api';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

class ChatSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): Socket {
    if (this.socket?.connected && this.token === token) return this.socket;

    this.disconnect();
    this.token = token;

    this.socket = io(SOCKET_URL, {
      // A plain `{ token }` object is captured once and reused for every
      // automatic reconnection attempt socket.io makes on its own — so if
      // the access token gets refreshed (a new one lands in `this.token`
      // via connect()) while a retry is already in flight, that retry
      // still resends the old, now-expired token and logs "Invalid token"
      // until the *next* explicit connect() call tears the socket down. A
      // function is invoked fresh on every attempt, so retries always pick
      // up whatever token is current.
      auth: (cb) => cb({ token: this.token }),
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
