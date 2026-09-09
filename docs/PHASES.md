# Phases de développement

- **Phase 1** — Architecture, base de données, authentification, chauffeurs, véhicules, points géographiques. ✅ (voir `docs/PHASE1_NOTES.md`)
  - [x] Schéma Prisma complet (toutes les tables du cahier des charges, section 17)
  - [x] Migrations (init + index GiST PostGIS)
  - [x] Bootstrap NestJS (main.ts, Swagger `/api/docs`, `/health`, ValidationPipe, Helmet, CORS, throttling)
  - [x] Module Prisma (`PrismaService` global)
  - [x] Module Common (JwtAuthGuard, RolesGuard, filtre d'exceptions, décorateurs)
  - [x] Module Auth (OTP chauffeur, login admin + OTP nouvel appareil, refresh avec rotation, change-password)
  - [x] Module Drivers (CRUD + assign-vehicle + revoke-device)
  - [x] Module Vehicles (CRUD + assign-driver + history)
  - [x] Module Locations (CRUD + generate-qr signé HMAC + écriture PostGIS `geom`)
  - [x] Bootstrap Roles/Users + `prisma/seed.ts` (organisation démo, rôles, super-admin démo)
  - [x] Tests Jest (19 tests, DB + Redis réels) — voir résultats dans PHASE1_NOTES.md
  - [ ] Logique métier missions/tracking/fuel/alerts — hors périmètre Phase 1 (schéma seulement)
- **Phase 2** — Missions, application chauffeur, QR code, photos, validation GPS. ✅ backend (voir `docs/PHASE2_NOTES.md`) — app mobile écrite mais non compilée (Flutter SDK indisponible sur cette machine)
  - [x] Module Missions (CRUD + assign/start/complete/cancel + endpoints mobile `today`/`:id`, `MissionEvent` sur chaque transition)
  - [x] Module Files (upload S3/MinIO, dédup SHA-256, URL signée courte durée)
  - [x] Module Mission-Steps : validation GPS + QR + photo (11 vérifications serveur, 8 codes d'erreur, idempotence par `clientEventId`)
  - [x] Tests Jest (40 tests, DB + Redis + MinIO réels) — tous passants
  - [x] App mobile Flutter (écrans 1-11 et 15 : connexion OTP, missions, scan QR, photo, résultat de validation, profil) — Flutter 3.47.2 installé, `flutter create .`, `flutter analyze` (0 erreur) et `flutter test` (23/23) exécutés avec succès
  - [ ] Socket.IO / diffusion temps réel des événements de mission — Phase 3
- **Phase 3** — GPS en arrière-plan, mode hors connexion, synchronisation, monitoring WebSocket, traces temps réel. ✅ backend (voir `docs/PHASE3_NOTES.md`)
  - [x] Module Tracking (ingestion GPS unitaire + batch, idempotence, upsert `VehicleLatestPosition`, alertes MOCK_GPS/SPEEDING)
  - [x] Traces GeoJSON (`vehicles/:id/trace`, `missions/:id/trace`) — trace brute non modifiée, ordre chronologique
  - [x] `GET vehicles/live` avec statut dérivé à la volée (MOVING/ON_MISSION/STOPPED/OFFLINE/SUSPICIOUS)
  - [x] Passerelle WebSocket (`/tracking` namespace, rooms organization/vehicle/mission, auth JWT à la connexion)
  - [x] Diffusion des événements missions/mission-steps déjà écrits en Phase 2 (`mission.started`, `mission.completed`, `mission.step.validated`, `alert.created`)
  - [x] Tests Jest (47 tests au total, incluant 1 test WebSocket réel via socket.io-client) — tous passants
  - [ ] App mobile (GPS arrière-plan, file Drift/SQLite, synchronisation) — en cours (agents interrompus par une instabilité d'infrastructure, à reprendre)
  - [ ] Dashboard admin (carte temps réel MapLibre + Socket.IO) — en cours (agents interrompus par une instabilité d'infrastructure, à reprendre)
- **Phase 4** — Carburant, alertes, détection des anomalies. ✅ backend (voir `docs/PHASE4_NOTES.md`)
  - [x] Module Fuel (`POST/GET /fuel-records`, `GET /fuel-records/:id`, `GET /vehicles/:id/fuel-summary`, `GET /vehicles/:id/fuel-anomalies`) — déclaration toujours acceptée, anomalies = `Alert` non bloquantes
  - [x] Module Alerts (`GET /alerts` filtrable, `GET /alerts/:id`, `PATCH /alerts/:id` avec machine à états `AlertStatus` validée + `AuditLog`)
  - [x] Score de suspicion explicable (`Alert.score` + `Alert.scoreBreakdown`) branché sur MOCK_GPS (40), SPEEDING (20), précision GPS insuffisante (10, tracking) et les 6 anomalies carburant
  - [x] Balayage cron `VehicleOfflineCron` (`@nestjs/schedule`, toutes les 2 min) — `vehicle.offline` sans répétition
  - [x] Tests Jest (64 tests au total : 47 avant Phase 4 + 17 nouveaux — 9 fuel, 4 alerts, 2 cron, 2 scoring tracking) — tous passants
  - [ ] Géofencing (chauffeur hors zone, +30 pts), heure incohérente (+15 pts) — hors périmètre, aucun signal propre disponible (voir Phase 5 follow-ups dans PHASE4_NOTES.md)
- **Phase 5** — Rapports, optimisations, tests complets, déploiement.
  - [x] Module Reports backend (`apps/api/src/reports/`) — `GET /reports/missions|fuel|gps-positions`, filtrable période/véhicule/chauffeur/statut/point de collecte/mission, export `json|csv|xlsx|pdf` réellement valides (CSV parseable, XLSX relu par exceljs, PDF signature `%PDF-`) — voir `docs/PHASE5_NOTES.md`. UI `apps/admin-web/src/features/reports/` — autre agent, hors périmètre de ce travail.
  - [x] Correctif idempotence `POST /fuel-records` (`clientEventId`, même motif que `GpsPosition`/`MissionStepValidation`) — bug documenté dans `docs/PHASE4_NOTES.md` "Follow-ups Phase 5"
  - [x] Tests sécurité bout en bout (`src/common/security-e2e.spec.ts`) : RBAC 401/403 réel sur la pile HTTP, validation des entrées (400), rate limiting `ThrottlerGuard` réellement déclenché (429)
  - [x] Index `Alert` ajoutés (`type`, `level`, `status`, `status+createdAt`) pour les patterns de filtrage `GET /alerts` et `GET /reports/*`
  - [x] Plan de partitionnement `gps_positions` documenté (`docs/PHASE5_NOTES.md`) — non implémenté (changement de stockage trop structurant pour être vérifié en sécurité cette phase)
  - [x] Tests Jest : 79/79 passants (64 avant Phase 5 + 15 nouveaux : 1 idempotence fuel, 6 reports, 8 sécurité e2e)
  - [x] `apps/admin-web/Dockerfile` (build multi-stage, sortie Next.js `standalone` — voir `next.config.mjs`) — build et run réels vérifiés (`docker build`, conteneur démarré, `GET /login` → 200)
  - [x] `docker-compose.yml` revu : healthchecks sur les 6 services (postgres/redis/minio déjà + api/admin-web ajoutés), `depends_on: condition: service_healthy`, `version:` obsolète retiré, variables `NEXT_PUBLIC_*`/`API_BASE_URL` de `admin-web` documentées dans `.env.example` — validé avec `docker compose config` **et** stack complète (6 services) démarrée réellement sous un projet séparé (`prod-check`), migrations + seed appliqués, login admin bout en bout à travers nginx vérifié (voir `docs/DEPLOYMENT.md`)
  - [x] `infrastructure/nginx/default.conf` revu : route `/health`, en-têtes `X-Forwarded-*`, `proxy_read_timeout` étendu sur `/socket.io/` (WebSocket tracking longue durée), gabarit HTTPS commenté (TLS non automatisé — voir `docs/DEPLOYMENT.md`). Bug réel trouvé et corrigé en testant la stack complète : le bloc générique `/api/` envoyait aussi les Route Handlers internes Next.js (`/api/auth/*`, `/api/reports/*`) vers l'api NestJS au lieu d'`admin-web`, cassant le login admin à travers nginx (404) — remplacé par des blocs explicites `/api/auth/`, `/api/reports/` → `admin-web` et `/api/v1/` → `api`, re-testé OK (voir `docs/DEPLOYMENT.md`)
  - [x] CI (`.github/workflows/ci.yml`) étendue : job `api-tests` + MinIO en service container (Files/Fuel en dépendent depuis Phase 2), nouveaux jobs `admin-web` (vitest + build) et `mobile` (Flutter 3.47.2 : pub get/analyze/test)
  - [x] `infrastructure/scripts/backup.sh` / `restore.sh` — testés réellement contre le Postgres de dev (dump + restauration vers une base de test, tables vérifiées)
  - [x] `docs/DEPLOYMENT.md` — guide de déploiement, graphe de dépendances/healthchecks, différences dev/test/prod, référence env vars, limites connues (pas de TLS automatisé, pas de CDN, pas de scaling multi-instance)

Pour chaque module : migrations Prisma → API → permissions → tests → documentation Swagger,
avant de passer au module suivant.

## Critères d'acceptation du MVP
Voir section 24 du cahier des charges original (conservé dans `docs/PROMPT_ORIGINAL.md`).
