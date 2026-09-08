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
  - [x] App mobile Flutter (écrans 1-11 et 15 : connexion OTP, missions, scan QR, photo, résultat de validation, profil) — code complet, **non vérifié** (pas de SDK Flutter disponible ici ; nécessite `flutter create .`, `flutter pub get`, `flutter test` sur une machine équipée avant la Phase 3)
  - [ ] Socket.IO / diffusion temps réel des événements de mission — Phase 3
- **Phase 3** — GPS en arrière-plan, mode hors connexion, synchronisation, monitoring WebSocket, traces temps réel.
- **Phase 4** — Carburant, alertes, détection des anomalies.
- **Phase 5** — Rapports, optimisations, tests complets, déploiement.

Pour chaque module : migrations Prisma → API → permissions → tests → documentation Swagger,
avant de passer au module suivant.

## Critères d'acceptation du MVP
Voir section 24 du cahier des charges original (conservé dans `docs/PROMPT_ORIGINAL.md`).
