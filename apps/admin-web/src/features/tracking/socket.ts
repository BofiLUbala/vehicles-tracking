import { io, type Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_WS_URL ?? 'http://localhost:3001';

/**
 * Ouvre la connexion Socket.IO vers la passerelle de suivi temps réel (namespace `/tracking`) et
 * s'abonne explicitement à la salle de l'organisation. Le JWT est transmis via le payload `auth`
 * du handshake (jamais en query string).
 *
 * Contrat backend : voir `docs/PHASE3_NOTES.md` — namespace `/tracking`, salles
 * `organization:{orgId}` / `vehicle:{vehicleId}` / `mission:{missionId}`, abonnement via
 * `socket.emit('subscribe', { room })`. La salle organisation est déjà rejointe automatiquement
 * par le gateway à la connexion ; l'abonnement explicite ci-dessous est sans effet néfaste (idempotent).
 */
export function connectTrackingSocket(accessToken: string, organizationId: string): Socket {
  const socket = io(`${WS_URL}/tracking`, {
    transports: ['websocket'],
    auth: { token: accessToken },
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket.emit('subscribe', { room: `organization:${organizationId}` });
  });

  return socket;
}
