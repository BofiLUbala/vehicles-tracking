# Phase 3 — Notes (backend)

Périmètre livré côté `apps/api/` : ingestion GPS temps réel, traces GeoJSON, statut véhicule
dérivé, passerelle WebSocket. Le mobile (GPS arrière-plan + file d'attente hors-ligne) et le
dashboard admin (carte temps réel) sont en cours sur des agents séparés — voir `docs/PHASES.md`
pour l'état à jour.

## Contrat REST

```
POST /api/v1/tracking/positions          (chauffeur — position unique)
POST /api/v1/tracking/positions/batch    (chauffeur — lot, rejeu de synchronisation hors-ligne)
GET  /api/v1/tracking/vehicles/live      (admin/super-admin)
GET  /api/v1/tracking/vehicles/:id/latest
GET  /api/v1/tracking/vehicles/:id/trace?from=&to=
GET  /api/v1/tracking/missions/:id/trace
```

### Payload position (`POST positions` / items de `positions/batch`)
```json
{
  "clientEventId": "uuid",
  "vehicleId": "uuid",
  "missionId": "uuid | null",
  "latitude": -4.32512,
  "longitude": 15.32245,
  "accuracy": 8.5,
  "altitude": 312,
  "speed": 28,
  "heading": 145,
  "isMocked": false,
  "recordedAt": "2026-09-08T10:30:15Z"
}
```
- `clientEventId` idempotent : une resoumission renvoie la position déjà stockée (jamais de doublon).
- Le chauffeur soumettant doit être **actuellement affecté** au `vehicleId` (et à `missionId` si fourni) — sinon 403.
- La position est **toujours stockée**, même en cas d'anomalie détectée (vitesse impossible, position mockée) — seule l'affectation chauffeur/véhicule invalide bloque l'écriture. La trace GPS brute ne doit jamais être perdue.

### `POST /tracking/positions/batch`
Corps : `{ "positions": [ ...payload ] }`. Traité dans l'ordre de `recordedAt` (indépendamment de l'ordre de soumission). Réponse — un résultat par item, jamais tout-ou-rien :
```json
[{ "clientEventId": "uuid", "status": "created" | "duplicate" | "rejected", "reason": "message si rejeté" }]
```
Côté mobile : `created`/`duplicate` → marquer `synced` localement ; `rejected` → marquer `failed` avec `reason` dans `lastError`.

### Traces GeoJSON (`.../trace`)
```json
{
  "type": "Feature",
  "properties": { "vehicleId": "uuid", "missionId": "uuid | null" },
  "geometry": { "type": "LineString", "coordinates": [[lng, lat], ...] }
}
```
Toujours la trace brute non modifiée (jamais de map-matching), ordre chronologique croissant, coordonnées `[longitude, latitude]` (convention GeoJSON).

### `GET /tracking/vehicles/live`
```json
[{
  "vehicleId": "uuid",
  "plateNumber": "...",
  "status": "MOVING" | "ON_MISSION" | "STOPPED" | "OFFLINE" | "SUSPICIOUS",
  "latestPosition": { "latitude": 0, "longitude": 0, "speed": 0, "heading": 0, "updatedAt": "ISO" } | null
}]
```
Couleurs attendues côté dashboard (section 12 du cahier des charges) : MOVING=vert, ON_MISSION=bleu, STOPPED=orange, OFFLINE=rouge, SUSPICIOUS=violet.

Dérivation du statut (calculée à la lecture, jamais persistée) :
1. Aucune position depuis `VEHICLE_OFFLINE_THRESHOLD_MINUTES` (défaut 5 min) → `OFFLINE`.
2. Une alerte `SPEEDING`/`MOCK_GPS` dans les 30 dernières minutes → `SUSPICIOUS`.
3. Une mission `STARTED`/`IN_PROGRESS` sur ce véhicule → `ON_MISSION`.
4. Vitesse > 3 km/h → `MOVING`, sinon → `STOPPED`.

## Anomalies GPS détectées (sous-ensemble de la section 15 pertinent en Phase 3)
- **`isMocked: true`** → `Alert` `MOCK_GPS` sévérité `LOW`, position acceptée quand même.
- **Vitesse implicite impossible** (distance/temps entre deux positions successives du véhicule) > `MAX_PLAUSIBLE_SPEED_KMH` (défaut 150 km/h) → `Alert` `SPEEDING` sévérité `MEDIUM`, position acceptée quand même.
- **Sortie de zone** : hors périmètre — aucune table de polygone de zone autorisée n'existe encore. Follow-up Phase 4.
- Balayage périodique "véhicule hors ligne" (cron émettant `vehicle.offline` proactivement) : non implémenté — le statut `OFFLINE` est calculé réactivement à chaque lecture de `/vehicles/live` ou dérivation de statut, ce qui suffit pour l'affichage dashboard mais ne déclenche pas de notification push spontanée. Follow-up Phase 3.5/4 si nécessaire (`@nestjs/schedule`).

## Contrat WebSocket

Namespace : `/tracking`. Connexion : JWT (access token) via `auth: { token }` du handshake `socket.io-client`, ou query `?token=`, ou header `Authorization: Bearer`. Un client non authentifié est déconnecté immédiatement. Rejoint automatiquement `organization:{organizationId}` à la connexion.

Rooms :
```
organization:{organizationId}
vehicle:{vehicleId}
mission:{missionId}
```
Un client rejoint/quitte une room additionnelle via les messages `subscribe`/`unsubscribe` :
```js
socket.emit('subscribe', { room: 'vehicle:uuid' });
socket.emit('unsubscribe', { room: 'vehicle:uuid' });
```

Événements diffusés (payload minimal — jamais de rediffusion d'historique) :
| Événement | Rooms | Payload |
|---|---|---|
| `vehicle.position.updated` | organization, vehicle, mission (si présent) | `{ vehicleId, missionId, latitude, longitude, speed, heading, recordedAt }` |
| `vehicle.status.updated` | organization, vehicle | `{ vehicleId, status }` (émetteur disponible, non encore appelé automatiquement — voir follow-up) |
| `vehicle.offline` | organization, vehicle | `{ vehicleId, lastSeenAt }` (émetteur disponible, non encore appelé automatiquement — pas de balayage cron, voir ci-dessus) |
| `mission.started` | organization, mission | `{ missionId, driverId, vehicleId }` |
| `mission.completed` | organization, mission | `{ missionId, status }` (COMPLETED ou NOT_COMPLETED) |
| `mission.step.validated` | organization, mission | `{ missionId, stepId, order }` |
| `alert.created` | organization, vehicle (si présent), mission (si présent) | `{ alertId, type, level, vehicleId, driverId, missionId }` |

Un client abonné à `vehicle:{id}` reçoit `vehicle.position.updated` immédiatement après chaque ingestion réussie (unitaire ou item d'un batch) pour ce véhicule.

## Variables d'environnement ajoutées
```
MAX_PLAUSIBLE_SPEED_KMH=150
VEHICLE_OFFLINE_THRESHOLD_MINUTES=5
```
(présentes dans `.env.example` racine et `apps/api/.env.example`)

## Déviations / simplifications documentées
- Pas de géofencing (zones autorisées/interdites) — aucune table de polygone n'existe. Follow-up Phase 4.
- Pas de balayage cron proactif "véhicule hors ligne" — statut calculé réactivement à la lecture. Les émetteurs `emitVehicleStatusUpdated`/`emitVehicleOffline` existent dans `RealtimeEventsService` mais ne sont pas encore appelés automatiquement par un job planifié.
- La colonne `VehicleLatestPosition.status` (enum `VehicleStatus` du schéma Prisma : AVAILABLE/ON_MISSION/BROKEN_DOWN/...) reflète le statut *métier* du véhicule, distinct du statut *live* (MOVING/STOPPED/OFFLINE/SUSPICIOUS) calculé pour l'affichage carte — ce sont deux notions différentes, volontairement non fusionnées.

## Tests
`apps/api/src/tracking/tracking.spec.ts` — 8 tests (ingestion + idempotence, chauffeur non affecté rejeté, batch mixte, vitesse impossible → alerte + position stockée, dérivation de statut live, trace GeoJSON, un test WebSocket bout-en-bout via `socket.io-client`). Total suite complète : **47/47 tests passants** (DB/Redis/MinIO réels via `docker compose up -d postgres redis minio`, ports remappés 5434/6380/9000-9001 — voir `docs/PHASE1_NOTES.md`).

## Follow-ups Phase 4
- Géofencing (polygones de zones autorisées, alerte "sortie de zone").
- Balayage cron véhicule hors ligne + notification push (FCM).
- Système de score de suspicion complet (section 15 du cahier des charges) — actuellement seules 2 alertes GPS existent (MOCK_GPS, SPEEDING) ; il manque ROUTE_DEVIATION, UNAUTHORIZED_STOP, MISSED_STEP (déjà émis en amont ? à vérifier), LATE_ARRIVAL, FUEL_ANOMALY, DEVICE_OFFLINE.
- Carburant et ses anomalies dédiées.
- `emitVehicleStatusUpdated`/`emitVehicleOffline` : câblés dans `RealtimeEventsService` mais pas encore appelés — à brancher sur le futur job de balayage.
