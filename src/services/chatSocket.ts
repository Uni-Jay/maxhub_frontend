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
  // Listeners registered before the socket exists (or across reconnects) are
  // kept here and attached whenever a socket is created.
  private handlers = new Map<string, Set<(...args: any[]) => void>>();
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
      // Render's free/starter-tier proxy doesn't handle a direct websocket
      // handshake cleanly — opening with 'websocket' first produced exactly
      // "WebSocket is closed before the connection is established" followed
      // by a reconnect, repeatedly, which is what made chat feel slow.
      // Starting on polling and letting socket.io upgrade once the
      // connection is actually established is the standard, safe default.
      transports: ['polling', 'websocket'],
      // Keep retrying (with backoff) so live notifications and calls recover
      // after a network drop instead of silently stopping after 5 attempts.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    this.attachRegistered();

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
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void) {
    if (handler) this.handlers.get(event)?.delete(handler);
    else this.handlers.delete(event);
    this.socket?.off(event, handler);
  }

  /** Emits and resolves with the server's acknowledgement (rejects after a timeout). */
  emitAck<T = any>(event: string, data: any, timeoutMs = 10000): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Not connected — check your internet connection'));
      const t = window.setTimeout(() => reject(new Error('The server did not respond')), timeoutMs);
      this.socket.emit(event, data, (res: T) => { window.clearTimeout(t); resolve(res); });
    });
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  private attachRegistered() {
    if (!this.socket) return;
    for (const [event, set] of this.handlers) for (const h of set) this.socket.on(event, h);
  }
}

export const chatSocket = new ChatSocketService();
