# Phase 2 — notes

## Backend (`apps/api/`)

### Modules livrés
- **`missions/`** — CRUD admin (`GET/POST /missions`, `GET/PATCH /missions/:id`), transitions
  (`/assign`, `/start`, `/complete`, `/cancel`) et endpoints mobile scopés chauffeur
  (`GET /mobile/missions/today`, `GET /mobile/missions/:id`). Chaque transition écrit une ligne
  `MissionEvent` (type + payload) — c'est sur ces événements que la Phase 3 branchera la diffusion
  WebSocket (`mission.started`, `mission.completed`, `mission.step.validated`, etc.).
- **`files/`** — upload binaire vers S3/MinIO (`@aws-sdk/client-s3`), dédup par hash SHA-256
  (un contenu identique réutilise la même clé de bucket), URL de téléchargement signée à courte
  durée (`GET /files/:id/signed-url`, 5-15 min), jamais d'accès public permanent. Le service crée
  le bucket au démarrage s'il n'existe pas (`onModuleInit`).
- **`mission-steps/`** — `POST /mission-steps/:id/validate` (multipart : champ JSON + photo) et
  `GET /mission-steps/:id/evidence`. Voir le contrat d'erreurs ci-dessous.

### Contrat de validation (`POST /mission-steps/:id/validate`)
Vérifications serveur, dans l'ordre, avec court-circuit à la première échec :
1. Identité du chauffeur (JWT) = chauffeur affecté à la mission
2. Véhicule du chauffeur = véhicule de la mission
3. Mission active (STARTED/IN_PROGRESS)
4. Étape = prochaine étape non validée, dans l'ordre (ordre strict imposé)
5. Jeton QR valide (même logique de signature que `locations.generate-qr`) et lié au bon lieu
6. Distance position ↔ lieu ≤ rayon autorisé de l'étape (formule de Haversine)
7. Précision GPS ≤ seuil (`MAX_GPS_ACCURACY_METERS`, défaut 100m)
8. Heure serveur dans la fenêtre `plannedAt ± toleranceMin` (jamais l'heure du client)
9. Photo présente dans la requête
10. `clientEventId` inédit — sinon renvoie la validation existante en succès (idempotent, gère les
    retransmissions après coupure réseau)
11. `isMocked=true` → accepté quand même, mais crée une `Alert` de faible sévérité (pas de rejet dur)

Codes d'erreur (corps `{ statusCode, errorCode, message, timestamp }`) :

| errorCode | HTTP | Signification |
|---|---|---|
| `WRONG_DRIVER` | 403 | Chauffeur ou véhicule ne correspond pas à la mission |
| `INACTIVE_MISSION` | 400 | Mission pas en STARTED/IN_PROGRESS |
| `WRONG_STEP_ORDER` | 400 | Étape n'est pas la prochaine à valider |
| `INVALID_QR` | 400 | Signature QR invalide ou lieu ne correspond pas |
| `OUT_OF_RANGE` | 400 | Hors du rayon autorisé |
| `LOW_GPS_ACCURACY` | 400 | Précision GPS insuffisante |
| `WINDOW_EXPIRED` | 400 | Hors fenêtre de tolérance horaire |
| `MISSING_PHOTO` | 400 | Photo absente de la requête |

Ce contrat est celui consommé par l'app mobile (`frenchMessageForErrorCode`) — ne pas renommer les
codes sans mettre à jour les deux côtés.

### MinIO
Service ajouté à `docker-compose.yml` (`minio/minio:latest`, ports 9000/9001, credentials
`minioadmin`/`minioadmin123` en dev). Variables déjà dans `.env.example` (`S3_ENDPOINT`,
`S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION`, `S3_FORCE_PATH_STYLE`,
`FILE_SIGNED_URL_TTL_SECONDS`).

### Tests
40 tests Jest, tous passants, contre Postgres/Redis/MinIO réels (`docker compose up -d postgres
redis minio` puis `npm test` dans `apps/api`) :
- mission complétée de bout en bout (create → assign → start → valider toutes les étapes → complete)
- QR invalide, hors zone, photo manquante, hors fenêtre horaire → codes d'erreur attendus
- double soumission (`clientEventId`) → idempotent, pas de doublon en base
- chauffeur non affecté → 403
- étape validée hors ordre → `WRONG_STEP_ORDER`
- upload/dédup/URL signée du module Files

### Déviations / notes
- Ordre des étapes strictement imposé (pas d'étapes "libres") — simplifie la logique de progression
  de mission ; à revoir si un cas d'usage réel demande des étapes non ordonnées.
- Distance calculée par Haversine côté application plutôt que `ST_DWithin` PostGIS — évite la
  complexité de `$executeRaw` pour un calcul à cette échelle (quelques dizaines/centaines de
  mètres) ; PostGIS reste utilisé pour le stockage géométrique (`geom`) et sera nécessaire en
  Phase 3 pour les requêtes de trace/déviation à plus grande échelle.

## Mobile (`apps/mobile/`)

Écrans 1-11 et 15 du cahier des charges implémentés (splash, connexion téléphone, OTP WhatsApp,
permissions GPS, missions du jour, détail, démarrage, progression, scan QR, capture photo, résultat
de validation, profil/déconnexion) — Flutter/Riverpod/Dio/go_router/mobile_scanner/camera, codé
contre le contrat d'API ci-dessus.

**⚠️ Non vérifié** : le SDK Flutter n'était pas disponible sur la machine qui a écrit ce code, donc
`flutter pub get`, `flutter analyze`, `flutter test` et `flutter create .` (génération des dossiers
`android/`/`ios/`) n'ont pas pu être exécutés. Avant de continuer sur cette base :
1. `flutter create .` depuis `apps/mobile/` (sans écraser `lib/`, `pubspec.yaml`, `test/`)
2. Ajouter les permissions caméra/localisation dans les manifests Android/iOS générés
3. `flutter pub get` puis `flutter test` et `flutter analyze` — corriger ce qui ne compile pas

## Suivi pour la Phase 3
- GPS en arrière-plan + file d'attente hors-ligne (Drift/SQLite) côté mobile
- Ingestion `POST /tracking/positions[/batch]` côté backend
- Diffusion WebSocket (Socket.IO) des événements déjà loggés en `MissionEvent`
  (`mission.started`, `mission.completed`, `mission.step.validated`) + `vehicle.position.updated`
- Vérification complète de l'app mobile (SDK Flutter requis, voir ci-dessus)
