/**
 * Contrat REST/WebSocket du module alertes (`apps/api/src/alerts`, en cours de construction par
 * un agent séparé — voir `docs/PHASES.md`). Aucun `docs/PHASE4_NOTES.md` n'existait au moment
 * d'écrire ce code : les enums (`AlertType`, `AlertLevel`, `AlertStatus`) et les champs du modèle
 * `Alert` viennent du schéma Prisma déjà livré (`apps/api/prisma/schema.prisma`, seule source
 * autoritaire disponible) ; l'événement WebSocket `alert.created` vient de `docs/PHASE3_NOTES.md`
 * (namespace `/tracking`, déjà câblé côté backend mais pas encore consommé côté dashboard avant
 * ce travail). À réconcilier avec `docs/PHASE4_NOTES.md` dès sa publication.
 */

export type AlertType =
  | 'SPEEDING'
  | 'ROUTE_DEVIATION'
  | 'UNAUTHORIZED_STOP'
  | 'MOCK_GPS'
  | 'MISSED_STEP'
  | 'LATE_ARRIVAL'
  | 'FUEL_ANOMALY'
  | 'DEVICE_OFFLINE'
  | 'OTHER';

export type AlertLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Valeurs du schéma Prisma (`enum AlertStatus`) — distinct des libellés NEW/SEEN/... évoqués
 * informellement dans le cahier des charges ; on suit le schéma, seule source déjà versionnée. */
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface AlertVehicleRef {
  id: string;
  plateNumber: string;
}

export interface AlertDriverRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AlertMissionRef {
  id: string;
  reference?: string;
}

/** Élément individuel d'une éventuelle décomposition du score de suspicion (section 15 du cahier
 * des charges). Le modèle Prisma `Alert` n'a qu'un `score: Int` persisté — pas de colonne dédiée
 * pour la décomposition ; si le backend l'expose en champ calculé, ce type l'accueille, sinon
 * l'UI se rabat sur `message`. */
export interface AlertScoreReason {
  reason: string;
  points: number;
}

/** Forme brute renvoyée par `GET /alerts` (un item) / `PATCH /alerts/:id`. */
export interface AlertDto {
  id: string;
  type: AlertType;
  level: AlertLevel;
  status: AlertStatus;
  score: number;
  message: string | null;
  vehicleId: string | null;
  driverId: string | null;
  missionId: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: AlertVehicleRef | null;
  driver?: AlertDriverRef | null;
  mission?: AlertMissionRef | null;
  scoreBreakdown?: AlertScoreReason[];
}

/** Alias utilisé côté écran Carburant pour les anomalies `FUEL_ANOMALY` d'un véhicule. */
export type FuelAnomalyDto = AlertDto;

export interface AlertFilters {
  type?: AlertType;
  level?: AlertLevel;
  status?: AlertStatus;
  vehicleId?: string;
  driverId?: string;
  missionId?: string;
  from?: string;
  to?: string;
}

/** Payload de l'événement Socket.IO `alert.created` (namespace `/tracking`, voir PHASE3_NOTES.md). */
export interface AlertCreatedEvent {
  alertId: string;
  type: AlertType;
  level: AlertLevel;
  vehicleId: string | null;
  driverId: string | null;
  missionId: string | null;
}
