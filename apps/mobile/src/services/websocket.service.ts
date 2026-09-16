import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../utils/env';
import { AuthService } from './auth.service';

type MessageHandler = (data: any) => void;

class WebSocketServiceClass {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await AuthService.getAccessToken();
    if (!token) return;

    this.disconnect();

    this.socket = io(`${WS_URL}/tracking`, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      // Re-attach existing event listeners
      this.listeners.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this.socket?.on(event, handler);
        });
      });
    });

    this.socket.on('connect_error', () => {
      // Handled silently
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { room });
    }
  }

  unsubscribeFromRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { room });
    }
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => {
      this.listeners.get(event)?.delete(handler);
      this.socket?.off(event, handler);
    };
  }
}

export const WebSocketService = new WebSocketServiceClass();
