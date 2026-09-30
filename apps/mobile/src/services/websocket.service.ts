import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../utils/env';
import { AuthService } from './auth.service';
import { AuthApi } from '../api/auth.api';

type MessageHandler = (data: any) => void;

/** Délai avant de retenter après un refus serveur (jeton expiré) — évite une boucle serrée. */
const SERVER_DISCONNECT_RETRY_MS = 3000;

class WebSocketServiceClass {
  private socket: Socket | null = null;
  private serverRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  /** Rooms désirées — ré-émises à chaque (re)connexion, sinon une souscription faite hors ligne serait perdue. */
  private rooms: Set<string> = new Set();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await AuthService.getAccessToken();
    if (!token) return;

    this.disconnect();

    const socket = io(`${WS_URL}/tracking`, {
      // Jeton relu à CHAQUE tentative : un jeton figé à la création expire (15 min) et toutes les
      // reconnexions suivantes étaient refusées — le chauffeur ne recevait plus ses missions en direct.
      auth: (cb) => {
        AuthService.getAccessToken().then((current) => cb({ token: current ?? '' }));
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      // Réseau mobile instable : ne jamais abandonner (auparavant 10 essais ≈ 20 s, puis plus de temps réel).
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
    });
    this.socket = socket;

    // Les écrans s'abonnent souvent AVANT que la socket existe (connect() est asynchrone, et une
    // nouvelle socket est créée à chaque connexion) : on rattache ici tous les écouteurs connus.
    this.listeners.forEach((handlers, event) => {
      handlers.forEach((handler) => socket.on(event, handler));
    });

    socket.on('connect', () => {
      // Ré-abonne aux rooms demandées (le serveur ne mémorise aucun abonnement côté client).
      this.rooms.forEach((room) => {
        socket.emit('subscribe', { room });
      });
    });

    socket.on('connect_error', () => {
      // Handled silently
    });

    socket.on('disconnect', (reason) => {
      // Le serveur ferme la connexion quand le jeton est refusé (expiré) ; socket.io ne se reconnecte
      // alors jamais seul. Un appel authentifié déclenche le renouvellement de session (intercepteur
      // axios), puis on relance la connexion avec le nouveau jeton.
      if (reason !== 'io server disconnect' || this.socket !== socket) return;
      if (this.serverRetryTimer) clearTimeout(this.serverRetryTimer);
      this.serverRetryTimer = setTimeout(async () => {
        this.serverRetryTimer = null;
        if (this.socket !== socket) return;
        try {
          await AuthApi.getProfile();
        } catch {
          // hors ligne ou session close : la tentative suivante (ou la déconnexion forcée) tranchera
        }
        if (this.socket === socket && (await AuthService.getAccessToken())) {
          socket.connect();
        }
      }, SERVER_DISCONNECT_RETRY_MS);
    });
  }

  disconnect(): void {
    if (this.serverRetryTimer) {
      clearTimeout(this.serverRetryTimer);
      this.serverRetryTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribeToRoom(room: string): void {
    this.rooms.add(room);
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { room });
    }
  }

  unsubscribeFromRoom(room: string): void {
    this.rooms.delete(room);
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
