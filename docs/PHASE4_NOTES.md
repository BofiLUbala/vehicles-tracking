# Phase 4 — Carburant, alertes, détection des anomalies

Backend uniquement (`apps/api/`). Deux autres agents travaillent en parallèle sur l'app mobile
(écran de déclaration carburant, `apps/mobile/lib/features/fuel/`) et le dashboard admin
(`apps/admin-web/src/app/(dashboard)/fuel/`, `.../alerts/`) — le contrat REST ci-dessous est ce
contre quoi ils codent ; les noms de champs/endpoints n'ont pas été renommés.

## Contexte de reprise

Cette phase a été commencée par un agent précédent, interrompu par une limite de débit au niveau du
compte (pas un problème de code). À la reprise :
- `apps/api/prisma/schema.prisma` avait déjà `Alert.scoreBreakdown Json?` (migration
  `20260908211400_add_alert_score_breakdown` déjà créée et appliquée).
- `apps/api/src/common/alert-score.util.ts` existait déjà (barème + `buildAlertScore`).
- `apps/api/src/tracking/tracking.service.ts` était partiellement modifié (import du util fait,
  mais le score n'était pas encore branché sur les `Alert.create`).
- `src/fuel/` et `src/alerts/` étaient vides (seulement `.gitkeep`).

Ce document couvre tout le travail de cette phase (fini + nouveau), pas seulement la reprise.

## Module Fuel (`src/fuel/`)

### Contrat REST
```
POST /api/v1/fuel-records                 (DRIVER, multipart/form-data)
  champs : metadata (JSON stringifié, voir CreateFuelRecordMetadataDto), receipt (fichier), odometerPhoto (fichier)
  → { record, distanceKm, consumptionL100km, anomalies: [{ alertId, type, level, message, score, scoreBreakdown }] }

GET  /api/v1/fuel-records                 (ADMIN/SUPER_ADMIN, org-scopé)
  query : vehicleId?, driverId?, from?, to? (ISO 8601, sur createdAt)

GET  /api/v1/fuel-records/:id             (ADMIN/SUPER_ADMIN, org-scopé)

GET  /api/v1/vehicles/:id/fuel-summary    (ADMIN/SUPER_ADMIN)
  query : from?, to?
  → { vehicleId, recordCount, totalLiters, totalCost, totalDistanceKm, averageConsumptionL100km }

GET  /api/v1/vehicles/:id/fuel-anomalies  (ADMIN/SUPER_ADMIN)
  → Alert[] (type=FUEL_ANOMALY) pour ce véhicule
```

`CreateFuelRecordMetadataDto` : `vehicleId, liters, totalCost, odometer, fuelType, stationName?, latitude?, longitude?`
— champs `FuelRecord` exacts du schéma (`vehicleId, driverId, liters, totalCost, odometer, fuelType,
stationName, latitude, longitude, receiptFileId, createdAt`).

### Règle d'or : jamais de rejet pour anomalie
Une déclaration de carburant est **toujours acceptée et stockée**, avec les deux photos, quelle que
soit l'anomalie détectée — même logique que MOCK_GPS/SPEEDING en tracking (Phase 3) : on ne perd
jamais de preuve. Seuls trois cas sont rejetés (400/403/404), tous **avant** la création :
véhicule/organisation introuvable, chauffeur non affecté à ce véhicule, photo(s) manquante(s).

### Calcul distance/consommation (section 14)
```
distance (km) = odomètre actuel − odomètre du dernier plein CONNU pour ce véhicule (par createdAt desc)
consommation (L/100km) = litres / distance × 100   — calculée seulement si distance > 0
```
Si aucun plein précédent n'existe pour le véhicule : `distanceKm` et `consumptionL100km` valent
`null`, aucun calcul n'est tenté (comme demandé). Si `distance <= 0` (odomètre régressif) : la
consommation n'est PAS calculée (elle n'aurait pas de sens) — l'anomalie "odomètre régressif" la
remplace.

### Détection d'anomalies → `Alert` (type `FUEL_ANOMALY`)
Chacune des 6 règles ci-dessous, si déclenchée, crée SA PROPRE `Alert` (une déclaration peut donc
produire plusieurs alertes) avec `score`/`scoreBreakdown` explicables et diffuse `alert.created` via
`RealtimeEventsService` — même mécanisme que `tracking.service.ts`/`mission-steps.service.ts`.

| Règle | Niveau | Condition | Env var (défaut) |
|---|---|---|---|
| Odomètre régressif | HIGH | `odometer < précédent.odometer` | — |
| Consommation excessive | MEDIUM | `consumptionL100km > seuil` | `MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM` (40) |
| Litres > capacité réservoir | MEDIUM | `liters > vehicle.tankCapacity` (si connue) | — |
| Trop rapproché | MEDIUM | `< N heures` depuis la précédente déclaration du véhicule | `MIN_HOURS_BETWEEN_FUEL_RECORDS` (2) |
| Reçu réutilisé | HIGH | hash SHA-256 du reçu déjà vu sur une AUTRE déclaration (dédup globale, table `File`, motif identique à `FilesService.uploadFile`) | — |
| Loin d'une station autorisée | LOW (souple) | distance Haversine à la station `AUTHORIZED_GAS_STATION` la plus proche > 5 km — **ignoré si aucune station de ce type n'existe encore pour l'organisation** (rien à comparer, pas de faux positif) | constante fixe `AUTHORIZED_GAS_STATION_MAX_DISTANCE_METERS = 5000`, pas un env var (cohérent avec l'énoncé "named constant") |

### Photos
Deux fichiers uploadés via `FilesService` (réutilisation directe du pattern `mission-steps`) :
`relatedTo = 'FuelRecordReceipt'` et `'FuelRecordOdometerPhoto'`, `relatedId = FuelRecord.id`. Le
`receiptFileId` du `FuelRecord` pointe vers la ligne `File` du reçu (mis à jour après création, pour
avoir l'ID du `FuelRecord` disponible).

## Module Alerts (`src/alerts/`)

### Contrat REST
```
GET   /api/v1/alerts              (ADMIN/SUPER_ADMIN, org-scopé)
  query : type?, level?, status?, vehicleId?, driverId?, missionId?, from?, to?
GET   /api/v1/alerts/:id          (ADMIN/SUPER_ADMIN, org-scopé)
PATCH /api/v1/alerts/:id          (ADMIN/SUPER_ADMIN) body: { status }
```

Org-scoping : une `Alert` n'a pas d'`organizationId` propre (schéma Phase 1) — elle est rattachée
via `vehicleId` OU `driverId` (au moins un des deux, souvent les deux). `AlertsService.findAll`
résout donc l'organisation en croisant `vehicleId IN (véhicules de l'org)` OU `driverId IN
(chauffeurs de l'org)` ; `findOne`/`updateStatus` vérifient l'un ou l'autre pour l'alerte demandée.

### Machine à états `AlertStatus`
```
NEW ──► ACKNOWLEDGED ──► RESOLVED
 └────────────────────► DISMISSED
ACKNOWLEDGED ──► DISMISSED
```
`RESOLVED` et `DISMISSED` sont terminaux (aucune transition sortante — voir
`LEGAL_TRANSITIONS` dans `alerts.service.ts`). Une transition non listée (y compris rester sur le
même statut) lève `400 BadRequestException`. Chaque transition réussie écrit une ligne `AuditLog`
(`action: 'alert.status.updated'`, `metadata: { from, to }`, `actorId` = l'admin qui fait le PATCH).

## Score de suspicion explicable (section 15)

`Alert.score` (Int) + `Alert.scoreBreakdown` (Json — `[{ reason, points }]`) construits par
`buildAlertScore()` (`src/common/alert-score.util.ts`), branchés dans **tous** les services qui
créent des `Alert` : `tracking.service.ts`, `mission-steps.service.ts` (MOCK_GPS seulement — voir
ci-dessous), `fuel.service.ts`.

| Signal | Points | Statut |
|---|---|---|
| Fausse position détectée (MOCK_GPS) | +40 | ✅ implémenté — `tracking.service.ts` (ingestion position) |
| Chauffeur hors zone (géofencing) | +30 | ❌ **différé Phase 5** — aucune table de polygone de zone n'existe (voir aussi PHASE3_NOTES.md) |
| Saut géographique impossible (SPEEDING) | +20 | ✅ implémenté — `tracking.service.ts` |
| Heure incohérente | +15 | ❌ **différé Phase 5** — aucun signal propre identifié sans ambiguïté avec `WINDOW_EXPIRED` (mission-steps) qui rejette déjà la validation ; risque de double-compte sans base claire. Jugement assumé plutôt que d'inventer une règle arbitraire. |
| Précision GPS insuffisante | +10 | ✅ implémenté, avec une nuance : `mission-steps.service.ts` **rejette toujours** la validation d'étape (comportement Phase 2 déjà testé, non modifié pour ne pas casser le contrat existant) — aucune alerte n'y est créée pour ce cas précis. En tracking (`POST /tracking/positions`), en revanche, l'ingestion de position n'a jamais rejeté sur la précision GPS ; une `Alert` de type `OTHER` (aucune valeur d'enum `AlertType` dédiée n'existe), niveau LOW, score 10 y a été ajoutée — la position reste toujours stockée. |

Extension carburant (section 14, hors barème section 15 — valeurs choisies par analogie de
sévérité, documenté comme un jugement assumé, pas une valeur imposée par le cahier des charges) :
odomètre régressif +40, reçu réutilisé +40, consommation excessive +20, litres > capacité +20, trop
rapproché +15, loin d'une station +10 — voir table détaillée plus haut et
`ALERT_SCORE_POINTS` dans `alert-score.util.ts`.

Le score n'est **jamais** utilisé pour bloquer/rejeter quoi que ce soit — purement additif et
métadonnée d'affichage (tri/priorisation côté dashboard).

## Balayage cron véhicule hors ligne (`src/tracking/vehicle-offline.cron.ts`)

Follow-up Phase 3 (voir `docs/PHASE3_NOTES.md` "Follow-ups Phase 4"). `VehicleOfflineCron`,
`@Cron('0 */2 * * * *')` (toutes les 2 minutes, `@nestjs/schedule` — déjà en dépendance,
`ScheduleModule.forRoot()` enregistré dans `AppModule`).

Mécanisme :
1. Sélectionne les `VehicleLatestPosition` dont `updatedAt < now - VEHICLE_OFFLINE_THRESHOLD_MINUTES`.
2. Pour chacune, si son `updatedAt` (ISO) diffère du dernier `updatedAt` déjà notifié pour ce
   véhicule (cache en mémoire `Map<vehicleId, updatedAtIso>`), émet `vehicle.offline` via
   `RealtimeEventsService.emitVehicleOffline` et met à jour le cache — sinon, ne fait rien (pas de
   re-notification en boucle tant que le véhicule reste offline avec le même `updatedAt`).
3. Si le véhicule réémet une position (nouveau `updatedAt`) puis redevient offline plus tard, le
   nouveau `updatedAt` diffère du cache → réarme la notification.

Choix assumé : cache en mémoire (pas de table dédiée) — acceptable pour un signal de supervision non
critique métier (voir commentaire dans le fichier), une seule instance API tournant en Phase 4. La
logique est extraite dans `sweep()`, testée directement sans attendre un vrai tick cron
(`vehicle-offline.cron.spec.ts`).

## Variables d'environnement ajoutées
```
MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM=40
MIN_HOURS_BETWEEN_FUEL_RECORDS=2
```
(`VEHICLE_OFFLINE_THRESHOLD_MINUTES`, déjà présente depuis Phase 3, est réutilisée telle quelle par
le cron.) Ajoutées à `apps/api/.env.example` uniquement — pas de secret, valeurs par défaut déjà
codées en dur dans les services si l'env var est absente/invalide.

## Tests

`src/fuel/fuel.spec.ts` — 9 tests (création + calcul consommation, odomètre régressif, consommation
excessive, litres > capacité, trop rapproché, reçu réutilisé, 403 chauffeur non affecté,
fuel-summary, fuel-anomalies).

`src/alerts/alerts.spec.ts` — 4 tests (liste/filtre org-scopée, détail, transition légale
NEW→ACKNOWLEDGED→RESOLVED avec AuditLog, transition illégale rejetée).

`src/tracking/vehicle-offline.cron.spec.ts` — 2 tests (émission unique par `updatedAt`, aucune
émission sous le seuil) — appelle `sweep()` directement.

`src/tracking/tracking.spec.ts` — 2 tests ajoutés (score MOCK_GPS=40, score précision GPS
insuffisante=10 avec position quand même stockée) en plus de l'assertion de score ajoutée au test
SPEEDING existant.

**Total suite complète : 64/64 tests passants** (47 avant Phase 4 + 17 nouveaux), DB/Redis/MinIO
réels via `docker compose ps` (ports 5434/6380/9000-9001, déjà en service).

Sanity-check manuel : `npm run start:dev` démarre sans erreur, toutes les routes (dont
`FuelRecordsController`, `VehicleFuelController`, `AlertsController`) sont mappées dans les logs,
`ScheduleModule`/`VehicleOfflineCron` s'initialisent sans erreur, `GET /api/docs` répond 200.
Serveur arrêté après vérification.

## Follow-ups Phase 5
- Géofencing (table de polygones de zones autorisées/interdites) → débloque "chauffeur hors zone"
  (+30 pts) et "sortie de zone" (`ROUTE_DEVIATION`, déjà dans l'enum `AlertType` mais jamais émis).
- Signal "heure incohérente" (+15 pts) — à définir précisément (ex : position/validation en dehors
  des heures de service déclarées du chauffeur ?) avant implémentation, pour éviter le chevauchement
  avec `WINDOW_EXPIRED`.
- `MISSED_STEP`, `LATE_ARRIVAL`, `DEVICE_OFFLINE` : valeurs `AlertType` existantes dans le schéma,
  jamais émises — probablement rattachées à un futur job de supervision des missions planifiées
  (étape non validée dans les temps).
- Notification push (FCM) sur `vehicle.offline`/`alert.created` — actuellement diffusion WebSocket
  uniquement (`RealtimeEventsService`), pas de projection vers Firebase (`FIREBASE_PROJECT_ID` existe
  dans `.env.example` mais n'est utilisé nulle part encore).
- Rapports/export (section 21 du cahier des charges) — hors périmètre Phase 4, prévu Phase 5.
