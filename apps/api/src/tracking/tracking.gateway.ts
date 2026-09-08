import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';
import { RealtimeEventsService } from './realtime-events.service';

interface SubscribePayload {
  room?: string; // 'vehicle:{id}' ou 'mission:{id}'
}

/**
 * Gateway WebSocket temps réel (spec section 11/12) — diffuse les événements de suivi GPS et de
 * cycle de vie des missions. Aucune "rediffusion" d'historique : un client qui rejoint une room ne
 * reçoit que les événements émis APRÈS sa connexion (voir docs/PHASE3_NOTES.md pour le contrat
 * complet côté client).
 *
 * Auth : JWT (access token) requis en query/handshake (`?token=...` ou header `Authorization:
 * Bearer ...`), vérifié dans `handleConnection`. Un client non authentifié est déconnecté
 * immédiatement. Rejoint automatiquement `organization:{organizationId}` à la connexion ; les rooms
 * `vehicle:{id}`/`mission:{id}` sont rejointes à la demande via le message `subscribe`.
 */
// `@WebSocketGateway` est évalué à la définition de la classe (hors injection de dépendances) :
// on lit `CORS_ALLOWED_ORIGINS` directement sur `process.env`, comme `main.ts` le fait pour le CORS HTTP.
const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: { origin: corsOrigins.length > 0 ? corsOrigins : true, credentials: true },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('TrackingGateway');

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth?.token as string | undefined;
    const queryToken = client.handshake.query?.token as string | undefined;
    const header = client.handshake.headers?.authorization;
    const headerToken = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : undefined;
    return auth || queryToken || headerToken;
  }

  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const principal = await this.jwt.verifyAsync<AuthenticatedPrincipal>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
      });
      client.data.principal = principal;
      if (principal.organizationId) {
        await client.join(`organization:${principal.organizationId}`);
      }
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client déconnecté: ${client.id}`);
  }

  /** Rejoint la room `vehicle:{id}` ou `mission:{id}` — même organisation uniquement (pas de vérif fine ici, réservé à l'org). */
  @SubscribeMessage('subscribe')
  async onSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribePayload) {
    const principal = client.data.principal as AuthenticatedPrincipal | undefined;
    if (!principal || !body?.room) return;
    if (!/^(vehicle|mission):[a-zA-Z0-9-]+$/.test(body.room)) return;
    await client.join(body.room);
  }

  @SubscribeMessage('unsubscribe')
  async onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribePayload) {
    if (!body?.room) return;
    await client.leave(body.room);
  }
}
