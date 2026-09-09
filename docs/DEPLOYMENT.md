# Déploiement — Phase 5 (section 22 du cahier des charges)

Ce document complète `infrastructure/README.md`. Il couvre : comment lancer la stack complète,
le graphe de dépendances/healthchecks, sauvegarde/restauration, la référence des variables
d'environnement, et les limites connues de ce qui est livré ici.

## Vue d'ensemble de la stack

`docker-compose.yml` définit 6 services :

| Service    | Rôle                                              | Port(s) hôte (dev) |
|------------|----------------------------------------------------|---------------------|
| `postgres` | PostgreSQL 16 + PostGIS 3.4                         | 5434 → 5432 interne |
| `redis`    | Redis 7 (OTP, cache)                                | 6380 → 6379 interne |
| `minio`    | Stockage S3-compatible (photos de mission)          | 9000 (API), 9001 (console) |
| `api`      | Backend NestJS (`apps/api`)                         | 3001                |
| `admin-web`| Frontend Next.js (`apps/admin-web`)                 | 3000                |
| `nginx`    | Reverse-proxy (`infrastructure/nginx/default.conf`) | 80, 443             |

### Pourquoi les ports hôte 5434/6380 (au lieu de 5432/6379)

Sur la machine de développement utilisée pour ce projet, un processus tiers écoutait déjà sur le
port 5432 de l'hôte et interceptait silencieusement les connexions destinées au conteneur
Postgres (symptôme observé en Phase 1 : les tables existaient bien dans le conteneur, mais toute
connexion via `localhost:5432` depuis l'hôte atterrissait ailleurs). Voir `docs/PHASE1_NOTES.md`
pour le détail du diagnostic.

**Ceci ne concerne que les ports PUBLIÉS vers l'hôte de dev.** Le réseau Docker interne
(`api` → `postgres:5432`, `api` → `redis:6379`) n'est jamais affecté : les services du
`docker-compose.yml` se parlent toujours via les ports standards à l'intérieur du réseau Docker.
En production, sur une machine sans ce conflit, ces lignes `ports:` peuvent être remises à
`5432:5432` / `6379:6379` sans rien changer côté application — ou, mieux, retirées entièrement
si Postgres/Redis n'ont pas besoin d'être exposés à l'hôte (seul `api` en a besoin, via le réseau
Docker interne). La CI (`.github/workflows/ci.yml`) utilise des services GitHub Actions
indépendants sur les ports standards 5432/6379 et n'est pas concernée par ce remapping.

### Graphe de dépendances / healthchecks

```
postgres (healthcheck: pg_isready)  ─┐
redis (healthcheck: redis-cli ping) ─┼─→ api (healthcheck: GET /health) ─→ admin-web (healthcheck: GET /) ─→ nginx
minio (healthcheck: /minio/health/live) ─┘
```

`api` et `admin-web` utilisent `depends_on: condition: service_healthy` (pas seulement l'ordre de
démarrage) : Docker Compose attend que postgres/redis/minio répondent sain avant de démarrer
`api`, et que `api` réponde sain avant de démarrer `admin-web`. `nginx` démarre après `api` et
`admin-web` (condition `service_started`, healthcheck HTTP non pratique à ce niveau sans
dépendance supplémentaire dans l'image `nginx:alpine`).

## Lancer la stack complète

```bash
# Depuis la racine du repo
cp .env.example .env   # renseigner les secrets (JWT, etc.) — jamais commiter .env
docker compose up -d --build
docker compose ps
curl http://localhost/health         # via nginx
curl http://localhost:3001/health    # directement sur l'api
```

Pour développer sans reconstruire les images à chaque changement, ne démarrer que les
dépendances d'infra et lancer `api`/`admin-web` en local (`npm run start:dev` / `npm run dev`) :

```bash
docker compose up -d postgres redis minio
```

C'est le mode utilisé tout au long des Phases 1 à 4 de ce projet (voir `docs/PHASE1_NOTES.md`).

## Sauvegarde / restauration

`infrastructure/scripts/backup.sh` et `restore.sh` opèrent directement sur le conteneur
`postgres` via `docker exec` + `pg_dump`/`psql` (pas besoin d'outils Postgres installés sur
l'hôte).

```bash
# Sauvegarde (écrit infrastructure/backups/tracking_vehicles_<horodatage>.sql.gz)
./infrastructure/scripts/backup.sh

# Restauration (DESTRUCTIF : DROP puis recrée la base cible avant restauration)
./infrastructure/scripts/restore.sh infrastructure/backups/tracking_vehicles_20260101T000000Z.sql.gz
```

Les deux scripts déduisent le conteneur cible (`<projet>-postgres-1`) du nom du dossier repo par
défaut ; passez un nom de projet explicite en second argument si vous utilisez
`docker compose -p <nom>` (ex: un environnement de test isolé).

`infrastructure/backups/` est ignoré par git (sauf `.gitkeep`) : les sauvegardes ne doivent
jamais être commitées (elles contiennent des données personnelles — chauffeurs, positions GPS).
Prévoir en production une rétention/rotation et une copie hors du serveur (S3/MinIO distant,
stockage froid) — non automatisé ici.

Testé réellement pendant cette phase : `backup.sh` contre le Postgres de dev en cours
d'exécution (dump réussi, 64K), puis `restore.sh` du dump obtenu vers une base
`tracking_vehicles_restore_test` distincte (toutes les tables restaurées, vérifié via `\dt`),
base de test supprimée ensuite.

## Environnements (dev / test / prod)

| Aspect                     | Dev (local)                                   | Test (CI)                                        | Prod                                                            |
|-----------------------------|-----------------------------------------------|---------------------------------------------------|------------------------------------------------------------------|
| `DATABASE_URL`/`REDIS_URL`  | `localhost:5434` / `localhost:6380` (ports remappés, voir plus haut) ou `postgres`/`redis` (interne Docker) | services GitHub Actions sur ports standards 5432/6379 | hôte managé (RDS/Cloud SQL + ElastiCache/Redis managé, ou VM dédiée) — jamais les identifiants par défaut `postgres`/`postgres` |
| `NODE_ENV`                  | non positionné / `development`                | non positionné (défaut Nest = development, sans impact sur les tests) | `production` (positionné dans l'image Docker `api`/`admin-web`, désactive certains logs verbeux Next.js) |
| `CORS_ALLOWED_ORIGINS`      | `http://localhost:3000`                       | `http://localhost:3000` (fixe, non utilisé par les tests unitaires) | domaine(s) réel(s) de l'admin-web (`https://admin.example.org`), jamais `*` |
| `OTP_CHANNEL_MODE`          | `stub` (code OTP loggé `[DEV STUB]`, voir `docs/PHASE1_NOTES.md`) | `stub` (obligatoire — pas d'appel réseau externe en CI) | `live` (WhatsApp Cloud API réel ; l'envoi e-mail SMTP reste un `NotImplementedException` tant que `nodemailer` n'est pas ajouté — voir PHASE1_NOTES.md) |
| Secrets (`JWT_*`, `QR_TOKEN_SECRET`, ...) | valeurs arbitraires de dev, dans `apps/api/.env` non committé | valeurs de test fixes dans `ci.yml` (jamais des secrets réels) | secrets forts générés, injectés via un gestionnaire de secrets (GitHub Actions secrets / Vault / variables d'environnement de la plateforme d'hébergement) — jamais dans le repo |
| Stockage fichiers           | MinIO local (`docker-compose.yml`)             | MinIO éphémère (service container CI)             | MinIO auto-hébergé (persistant) ou S3 AWS réel (`S3_FORCE_PATH_STYLE=false`) |
| TLS                          | HTTP simple (nginx `:80`)                      | non applicable                                     | HTTPS obligatoire (voir gabarit dans `infrastructure/nginx/default.conf`) |

## Référence des variables d'environnement

Voir les fichiers `.env.example` commentés, source de vérité :
- `.env.example` (racine) — variables du service `api` en contexte docker-compose + variables
  `NEXT_PUBLIC_*`/`API_BASE_URL` du service `admin-web`.
- `apps/api/.env.example` — variables `api` en dev local hors Docker (ports remappés).
- `apps/admin-web/.env.example` — variables `admin-web` en dev local hors Docker.

Points notables :
- Les variables `NEXT_PUBLIC_*` sont inlinées dans le bundle JavaScript **au moment du build**
  (voir `apps/admin-web/Dockerfile`, `ARG`/`ENV` avant `npm run build`) : elles ne peuvent pas
  être changées simplement en changeant l'environnement du conteneur au runtime sans reconstruire
  l'image (ou sans les fournir comme `--build-arg` à `docker compose build`). `API_BASE_URL`
  (sans préfixe `NEXT_PUBLIC_`) reste lue côté serveur au runtime par les Route Handlers Next.js.
- Aucun secret réel n'est commité nulle part dans ce repo (`.env`, `apps/api/.env`,
  `apps/admin-web/.env.local` sont ignorés par git) ; `.github/workflows/ci.yml` n'utilise que des
  valeurs de test fixes, jamais de vrais secrets.

## CI (`.github/workflows/ci.yml`)

Trois jobs indépendants :
- **api-tests** : Postgres/PostGIS + Redis + MinIO (image `bitnami/minio`, choisie car les
  services GitHub Actions ne permettent pas de passer d'arguments de commande à l'image
  officielle `minio/minio`, qui en a besoin pour démarrer) comme services containers, migrations
  Prisma + seed + `npm test`.
- **admin-web** : `npm ci`, `npx vitest run`, `npm run build` (valide que le build Docker
  fonctionnera).
- **mobile** : `subosito/flutter-action@v2` épinglé sur Flutter 3.47.2 (version utilisée pour
  développer l'app), `flutter pub get`, `flutter analyze`, `flutter test`.

**Ce qui a été vérifié réellement pendant cette phase** : `docker compose config` (validation
YAML/interpolation), un build Docker réel des images `api` et `admin-web`, puis la stack complète
(les 6 services) démarrée sous un nom de projet séparé (`docker compose -p prod-check up -d
--build`, ports décalés — voir plus bas) pour ne pas perturber les conteneurs de dev en cours
d'utilisation. Vérifié bout en bout sur cette stack isolée :
- les 6 conteneurs démarrent et passent `healthy` (`docker compose -p prod-check ps`) ;
- `curl http://localhost:<port nginx>/health` répond `{"status":"ok"}` via nginx → api ;
- `npx prisma migrate deploy` équivalent (les migrations s'appliquent proprement sur une base
  neuve — les 4 migrations existantes passent, `_prisma_migrations` confirme `finished_at` non
  nul pour chacune) ;
- le seed (`node dist/prisma/seed.js` — voir note ci-dessous) crée l'organisation et l'admin démo ;
- **le flux de login admin bout en bout à travers nginx** : `POST /api/auth/login` (route interne
  Next.js appelée par le navigateur, voir `apps/admin-web/src/features/auth/api.ts`) → admin-web
  → api → OTP loggé en clair par le stub (`OTP_CHANNEL_MODE=stub`) → `POST
  /api/auth/verify-otp` → tokens JWT émis. Fonctionne à travers nginx exactement comme un
  navigateur réel le ferait (pas testé en appelant l'api directement, pour valider le routage).

**Bug réel trouvé et corrigé pendant cette vérification** : la configuration nginx ne routait
qu'un bloc générique `/api/` → service `api`. Or `apps/admin-web` a ses propres Route Handlers
Next.js sous `/api/auth/*` et `/api/reports/*` (cookies de session httpOnly, proxy authentifié de
téléchargement de rapports), appelés en relatif par le navigateur — donc à travers nginx, pas
directement. Avec l'ancien bloc générique, ces requêtes étaient interceptées et envoyées à l'api
NestJS (qui n'a rien sous `/api/auth/...`, seulement `/api/v1/auth/...`) et recevaient 404 : **le
login admin était totalement cassé en passant par nginx**, alors qu'il fonctionnait en accédant
directement à `admin-web:3000` (ce qui explique que ce bug n'avait pas été vu avant). Corrigé dans
`infrastructure/nginx/default.conf` en remplaçant le bloc générique par trois blocs explicites :
`/api/auth/` et `/api/reports/` → `admin-web`, `/api/v1/` → `api`. Reproduit puis re-testé après
correctif (rechargement à chaud de la config dans le conteneur nginx de la stack `prod-check`,
`nginx -s reload`) : `/api/auth/login` renvoie désormais `200` avec `requiresOtp: true` au lieu de
`404`.

Note sur le seed en production : l'image runtime `api` ne contient pas `ts-node` (dépendance de
dev) donc `npx prisma db seed` (qui invoque `ts-node prisma/seed.ts` selon `package.json`) échoue
dans le conteneur en production — il faut appeler directement le JS compilé :
`docker compose exec api node dist/prisma/seed.js`. À documenter/scripter si un mécanisme de seed
automatique au démarrage est souhaité (non fait ici, le seed reste une étape manuelle explicite,
ce qui est plus sûr pour un environnement déjà peuplé).

Stack `prod-check` démontée après vérification (`docker compose -p prod-check down -v`) — ports
utilisés dans cette vérification (18080 nginx, 13001 api, 13000 admin-web, 15434 postgres, 16380
redis, 19000/19001 minio) libérés, n'affectent pas les ports de dev standard (5434/6380/9000-9001)
ni la CI (5432/6379/9000).

**Ce qui n'a pas pu être vérifié** : le workflow `ci.yml` n'a pas été exécuté sur un vrai
runner GitHub Actions (pas d'accès réseau vers GitHub Actions depuis cet environnement) — la
relecture manuelle donne un niveau de confiance raisonnable (syntaxe standard, services
équivalents testés localement pour `api-tests` avec Postgres/Redis/MinIO en local), mais un
échec possible (ex: disponibilité de l'image `bitnami/minio`, timing du démarrage MinIO avant
les tests) ne pourra être confirmé qu'en poussant réellement la branche et en observant un run.

## Limites connues (honnêteté sur ce qui est dev-grade vs prod-grade)

- **Pas d'automatisation de certificat TLS** : `infrastructure/nginx/default.conf` documente un
  gabarit HTTPS commenté (certbot/Let's Encrypt ou équivalent à mettre en place manuellement),
  aucun renouvellement automatique n'est câblé.
- **Pas de CDN** : les assets statiques Next.js sont servis directement par le conteneur
  `admin-web` (via nginx), sans CDN devant.
- **Pas de scaling multi-instance** : `docker-compose.yml` démarre une seule instance de chaque
  service. Un `api` à plusieurs répliques nécessiterait un mécanisme de session/état partagé
  supplémentaire pour Socket.IO (adapter Redis pour Socket.IO, non configuré) puisque les rooms
  de la passerelle `tracking.gateway.ts` sont actuellement en mémoire process.
- **Sauvegardes locales uniquement** : `backup.sh` écrit sur le disque local du serveur
  (`infrastructure/backups/`), pas de réplication automatique vers un stockage distant.
- **MinIO en mode single-node** : pas de réplication/erasure coding configuré ; convient au
  volume de ce projet mais pas à une charge de production élevée sans révision.
- **Secrets en production** : ce repo ne fournit pas d'intégration avec un gestionnaire de
  secrets managé (Vault, AWS Secrets Manager, etc.) — `env_file: .env` sur l'hôte de prod reste
  la méthode la plus simple documentée ici, à durcir selon l'infrastructure d'hébergement réelle.
