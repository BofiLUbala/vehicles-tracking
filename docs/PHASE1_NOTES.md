# Phase 1 — Notes d'implémentation

Ce document complète `docs/PHASES.md`. Il décrit ce qui a été construit, les écarts par rapport
au cahier des charges (`docs/PROMPT_ORIGINAL.md`) et pourquoi, ce qui est volontairement stub,
comment faire tourner le projet, et les suites à donner en Phase 2.

## Ce qui a été construit

### Base de données (`apps/api/prisma/schema.prisma`)
Schéma Prisma complet couvrant **toutes** les tables du cahier des charges (section 17), y
compris les domaines hors périmètre Phase 1 (missions, tracking GPS, carburant, fichiers,
alertes, notifications, audit) : seul le schéma existe pour ces domaines, aucun
contrôleur/service. UUID en clé primaire, `organizationId` + index sur les tables multi-tenant,
`createdAt`/`updatedAt` partout, `deletedAt` (soft-delete) sur users/drivers/vehicles/locations,
enums Prisma réels pour tous les statuts, colonnes `geom` PostGIS via `Unsupported(...)` sur
`locations` et `gps_positions`.

Deux migrations :
- `20260908130000_init` — schéma complet + `CREATE EXTENSION IF NOT EXISTS postgis`.
- `20260908130100_postgis_gist_indexes` — index GiST sur `locations.geom` et
  `gps_positions.geom` (Prisma ne génère pas d'index sur les colonnes `Unsupported`, migration
  manuscrite nécessaire).

`geom` est renseignée par `$executeRaw` (`ST_SetSRID(ST_MakePoint(lng,lat),4326)`) au moment de
l'écriture — voir `LocationsService.setGeom()`. **Ce motif est à reproduire pour `gps_positions`
en Phase 3.**

`gps_positions` porte un commentaire `TODO Phase 3` : partitionnement mensuel par `recordedAt`
une fois le volume réel connu.

### API NestJS (`apps/api/src`)
- `main.ts` : Helmet, CORS piloté par `CORS_ALLOWED_ORIGINS`, `ValidationPipe` global
  (whitelist + forbidNonWhitelisted + transform), filtre d'exceptions global (jamais de stack
  trace/secret exposé), Swagger sur `/api/docs`, préfixe global `api/v1` (sauf `/health`).
- `prisma/` : `PrismaService` (`OnModuleInit`/`OnModuleDestroy`) exposé globalement.
- `common/` : `JwtAuthGuard` (passport-jwt, respecte `@Public()`), `RolesGuard` (lit
  `req.user.role` posé par le JWT), filtre d'exceptions, décorateurs `@CurrentUser`/
  `@CurrentDriver`/`@Roles`/`@Public`, throttling global (100 req/min). **Ordre des guards
  globaux important** (`app.module.ts`) : Throttler → Jwt (peuple `req.user`) → Roles (lit
  `req.user.role`).
- `auth/` : OTP chauffeur (téléphone, WhatsApp) et login admin (mot de passe + OTP e-mail
  conditionnel sur nouvel appareil, comparé via la table `Device`), refresh JWT avec rotation
  (détection de rejeu : la famille de sessions entière est révoquée), logout idempotent,
  `GET /profile`, `POST /change-password` (argon2, complexité imposée par DTO).
  - Codes OTP à 6 chiffres, hashés (argon2) avant stockage, expiration 5 min, 5 tentatives max,
    cooldown de renvoi 60s. Store rapide **Redis** (`RedisOtpStore`) + trace durable **Postgres**
    (`OtpRequest`). Réponses génériques (`requestOtp`/`resendOtp` ne confirment jamais
    l'existence d'un compte) ; échecs de vérification journalisés dans `AuditLog` (jamais le
    code lui-même — voir `redactSensitive()` dans `common/audit-log.util.ts`).
  - `OtpSenderPort` + implémentations stub (loggent `[DEV STUB]` + le code, récupérable en test)
    et "live" (`WhatsappCloudApiSender` appelle l'API Meta si configurée ; `SmtpEmailSender`
    lève `NotImplementedException` — voir section Stubs ci-dessous). Sélection via
    `OTP_CHANNEL_MODE=stub|live` (défaut `stub`).
- `drivers/`, `vehicles/`, `locations/` : CRUD + endpoints spécifiques
  (`assign-vehicle`/`revoke-device`, `assign-driver`/`history`, `generate-qr`), tous protégés
  `@Roles(ADMIN, SUPER_ADMIN)`, scoping strict par `organizationId`, Swagger complet.
  - QR code : jeton opaque signé HMAC-SHA256 (`locationId.nonce.signature`, base64url),
    jamais l'ID brut, stocké dans `LocationQrCode`, vérifiable en `timingSafeEqual` +
    contrôle de révocation en base.
- `roles/`, `users/` : bootstrap minimal en lecture (suffisant pour l'auth admin) — CRUD complet
  repoussé en Phase 2+.
- `prisma/seed.ts` : organisation démo, rôles DRIVER/ADMIN/SUPER_ADMIN + permissions de base,
  un super-admin de démonstration dont les identifiants viennent de `DEMO_ADMIN_EMAIL` /
  `DEMO_ADMIN_PASSWORD` (jamais un vrai secret committé).

### Tests (19 tests, tous verts)
```
PASS src/common/guards/roles.guard.spec.ts
PASS src/locations/locations.spec.ts
PASS src/vehicles/vehicles.spec.ts
PASS src/drivers/drivers.spec.ts
PASS src/auth/auth.spec.ts

Test Suites: 5 passed, 5 total
Tests:       19 passed, 19 total
```
Couverture : OTP incorrect/expiré, cooldown de renvoi, blocage après 5 tentatives, CRUD +
assign-vehicle chauffeur, CRUD + assign-driver + history véhicule, CRUD + génération QR + jeton
falsifié + jeton révoqué (lieu), RolesGuard (refuse/accepte/laisse passer), changement de mot de
passe (mauvais mot de passe actuel, succès, complexité DTO). Tests d'intégration réels contre
Postgres/Redis dockerisés (pas de mocks DB).

### Boot applicatif vérifié
`npm run start:dev` démarre proprement, `GET /health` → `{"status":"ok"}`, `/api/docs` répond
200, `POST /api/v1/auth/admin/login` avec les identifiants de démo renvoie bien
`{"requiresOtp":true,...}` (nouvel appareil, comportement attendu).

## Écarts / décisions notables

- **Ports Docker locaux non standards** : `docker-compose.yml` publie Postgres sur l'hôte
  **5434** (au lieu de 5432) et Redis sur **6380** (au lieu de 6379). Sur la machine de
  développement utilisée, un processus tiers écoutait déjà sur 5432 côté hôte et interceptait
  silencieusement les connexions TCP destinées au conteneur (symptôme : `docker exec` voyait les
  tables créées, mais toute connexion via le port publié 5432 obtenait un état de base vide).
  Le réseau interne Docker (`api` ↔ `postgres:5432`/`redis:6379`) n'est pas affecté, seuls les
  ports publiés vers l'hôte ont changé. `apps/api/.env` (local, non committé) utilise donc
  `localhost:5434` / `localhost:6380`.
- **`prisma migrate dev` non utilisable en shell non-interactif** (Git Bash/CI) : la CLI Prisma
  5.22 exige un TTY. Contournement documenté ci-dessous avec `prisma migrate diff` +
  application manuelle + `prisma migrate resolve --applied`, workflow reproductible en CI.

## Ce qui est stub (volontairement, pour Phase 1)

- **Envoi OTP réel** : `OTP_CHANNEL_MODE=stub` par défaut. `WhatsappCloudApiSender` appelle
  réellement l'API Graph si `WHATSAPP_PHONE_NUMBER_ID`/`WHATSAPP_ACCESS_TOKEN` sont renseignés,
  sinon lève `NotImplementedException`. `SmtpEmailSender` lève toujours
  `NotImplementedException` (aucun client SMTP ajouté comme dépendance en Phase 1 — prévoir
  `nodemailer` en Phase 2+ si l'envoi e-mail réel est nécessaire).
- **Stockage fichiers (S3)** : modèle `File` présent en base, aucun service d'upload.
- **Notifications push (FCM)** : modèle `Notification`/`Device.pushToken` présents, aucun envoi.
- **Déclencheurs OTP admin** : seul "nouvel appareil" est implémenté. Réinitialisation mot de
  passe, action sensible, connexion suspecte sont des points d'extension (TODO dans
  `AuthService.adminLogin`).

## Comment lancer le projet

```bash
# 1. Conteneurs (depuis la racine du repo)
docker compose up -d postgres redis

# 2. Config locale (apps/api/.env, non committé — voir apps/api/.env.example)
#    DATABASE_URL=postgresql://postgres:postgres@localhost:5434/tracking_vehicles?schema=public
#    REDIS_URL=redis://localhost:6380
#    + JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / QR_TOKEN_SECRET (valeurs de dev arbitraires)

cd apps/api
npm install

# 3. Migrations (environnement non-interactif : voir workaround ci-dessous)
npx prisma generate
npx prisma migrate deploy   # si ça échoue en P3005 (schema non vide), voir workaround

# Workaround non-interactif pour une NOUVELLE migration (prisma migrate dev exige un TTY) :
#   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script \
#     > prisma/migrations/<timestamp>_<nom>/migration.sql
#   psql "$DATABASE_URL" -f prisma/migrations/<timestamp>_<nom>/migration.sql
#   npx prisma migrate resolve --applied "<timestamp>_<nom>"

# 4. Seed (organisation démo + rôles + super-admin démo)
npx prisma db seed

# 5. Tests (nécessite Postgres/Redis up + migrations + seed)
npm test

# 6. Lancer l'API
npm run start:dev   # http://localhost:3001/health, http://localhost:3001/api/docs
```

## Suites pour la Phase 2

- Implémenter la logique métier missions/mission-steps (le schéma existe déjà) : création,
  affectation, validation par QR + géolocalisation + tolérance temporelle.
- Application chauffeur (photos, validation étape, upload S3 → brancher `File`).
- Remplacer les stubs OTP par de vrais envois si nécessaire à ce stade (sinon repousser à la mise
  en prod).
- CRUD complet Roles/Users (actuellement lecture seule, suffisant pour l'auth).
- Étendre les tests e2e (supertest) sur les routes HTTP complètes (validation DTO incluse) —
  Phase 1 teste les services directement plus une vérification manuelle du boot/Swagger.
