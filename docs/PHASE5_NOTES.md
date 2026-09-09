# Phase 5 — Rapports, optimisations, tests complets (backend)

Backend uniquement (`apps/api/`). Deux autres agents travaillent en parallèle sur le dashboard admin
(`apps/admin-web/`, y compris l'écran de rapports qui consomme le contrat REST ci-dessous) et sur
l'infrastructure/déploiement (`docker-compose.yml`, `infrastructure/`, `.github/workflows/`,
Dockerfiles) — aucun de ces répertoires n'a été touché par ce travail.

C'est la **dernière phase planifiée** du projet. Ce document est volontairement honnête sur ce qui
reste ouvert plutôt que de suggérer une complétude totale — voir "Ce qui reste pour une vraie mise en
production" en fin de document.

## 1. Correctif idempotence `POST /fuel-records`

Bug documenté dans `docs/PHASE4_NOTES.md` ("Follow-ups Phase 5") : contrairement à `GpsPosition`
(tracking) et `MissionStepValidation` (mission-steps), `FuelRecord` n'avait pas de `clientEventId` —
une resoumission réseau (retry mobile après timeout) aurait donc pu créer une déclaration en double
(et ré-émettre les alertes d'anomalie une seconde fois).

Corrigé à l'identique du motif déjà utilisé ailleurs :
- `FuelRecord.clientEventId String? @unique` ajouté au schéma (migration
  `20260908235614_add_fuel_record_client_event_id_and_alert_indexes`, voir §3).
  **Nullable** (pas `String @unique` strict) pour compatibilité ascendante avec un client mobile qui
  ne l'enverrait pas encore (Postgres autorise plusieurs `NULL` sur une colonne unique — seule une
  vraie valeur dupliquée est rejetée).
- `CreateFuelRecordMetadataDto.clientEventId?` ajouté (optionnel, même raison).
- `FuelService.create()` : contrôle d'idempotence **en premier**, avant toute validation métier —
  même déviation documentée que `mission-steps.service.ts#validate` (voir commentaire dans le code) :
  vérifier l'idempotence après les règles métier casserait l'idempotence elle-même si l'état a changé
  entre les deux soumissions.
- Une resoumission avec le même `clientEventId` renvoie `{ record: <existant>, distanceKm: null,
  consumptionL100km: null, anomalies: [], idempotentReplay: true }` sans réévaluer les anomalies ni
  ré-uploader les photos.
- Test : `src/fuel/fuel.spec.ts` — "idempotence : une resoumission du même clientEventId renvoie la
  déclaration existante sans créer de doublon ni ré-évaluer les anomalies".

Le contrat REST `POST /fuel-records` (section champs `metadata`) gagne donc un champ optionnel
`clientEventId` — non cassant pour l'app mobile existante (Phase 2/4), qui devra l'adopter pour
bénéficier de l'idempotence sur les retries réseau (recommandé mais non fait ici — `apps/mobile/`
hors périmètre de cet agent).

## 2. Module Reports (`src/reports/`) — section 20

### Contrat REST
```
GET /api/v1/reports/missions?from=&to=&vehicleId=&driverId=&status=&locationId=&format=csv|xlsx|pdf|json
GET /api/v1/reports/fuel?from=&to=&vehicleId=&driverId=&format=csv|xlsx|pdf|json
GET /api/v1/reports/gps-positions?from=&to=&vehicleId=&missionId=&format=csv|xlsx|pdf|json
```
Org-scopé, `ADMIN`/`SUPER_ADMIN` uniquement (mêmes rôles que `alerts`/`fuel-records` en lecture).
`from`/`to` en ISO 8601. `format` par défaut `json`.

- **`format=json`** (défaut) : tableau JSON classique, consommé directement par le tableau du
  dashboard admin (pas de fichier à parser côté client).
- **`format=csv`** : `text/csv; charset=utf-8`, `Content-Disposition: attachment`. Sérialisation
  maison (`src/reports/export/csv.util.ts`), RFC 4180 (guillemets échappés, CRLF) — pas de
  dépendance, l'échelle ne le justifiait pas.
- **`format=xlsx`** : `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, généré via
  `exceljs` (`src/reports/export/xlsx.util.ts`) — une feuille, en-tête en gras, largeurs de colonnes
  ajustées.
- **`format=pdf`** : `application/pdf`, généré via `pdfkit` (`src/reports/export/pdf.util.ts`) —
  tableau simple paysage A4, en-tête répété à chaque page, pas de mise en forme sophistiquée (le
  besoin est un export lisible, pas un document design).

Filtres section 20 couverts : période (`from`/`to`), véhicule, chauffeur, statut, point de collecte
(`locationId`, missions ayant au moins une étape à ce lieu), mission (`missionId`, rapport GPS).
**Filtre "zone" volontairement absent** : aucune table de polygone de zone n'existe encore (même
limite que le géofencing documentée dans `docs/PHASE4_NOTES.md`) — rien à filtrer, pas de faux
contrat. **Filtre "consommation"** : le rapport carburant EST la réponse à ce besoin (litres, coût,
odomètre, type par ligne) ; la consommation moyenne dérivée existe déjà via
`GET /vehicles/:id/fuel-summary` (Phase 4) — non dupliquée dans ce rapport pour éviter deux sources
de vérité sur le même calcul.

### Garde-fou volume
`REPORT_MAX_ROWS = 5000` (constante, `reports.service.ts`) plafonne chaque requête, en particulier
`gps-positions` (table à plus haut volume de l'appli). Pas de pagination pour l'instant — acceptable
en Phase 5 (organisation démo, volumes de test), mais **à remplacer par une vraie pagination
(curseur sur `createdAt`/`recordedAt`) avant un usage en production** avec un historique de plusieurs
mois. Documenté ici plutôt que caché.

### Tests
`src/reports/reports.spec.ts` — 6 tests : filtrage JSON (missions par véhicule/statut/point de
collecte, carburant par véhicule/chauffeur/période), et surtout la **validité structurelle réelle**
des trois formats d'export (pas seulement "ça ne plante pas") :
- CSV : nombre de lignes/colonnes exact, en-tête présent, round-trip `split('\r\n')`/`split(',')`.
- XLSX : le buffer produit est **relu** par `ExcelJS.Workbook().xlsx.load()` (pas seulement généré),
  nombre de lignes = nombre d'enregistrements + 1 (en-tête), en-tête présent.
- PDF : les 5 premiers octets sont bien `%PDF-` (signature de format), taille non triviale.

## 3. Migration Prisma (workaround non-interactif — voir `docs/PHASE1_NOTES.md`)

`prisma migrate dev` exige toujours un TTY indisponible en shell non-interactif ici. Contournement
habituel : `prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma
--script` a généré un script contenant, en plus des deux changements voulus, deux `DROP INDEX` sur
les index GiST PostGIS (`gps_positions_geom_gist_idx`, `locations_geom_gist_idx`) — un artefact du
diff (ces index sont créés par une migration SQL manuscrite, invisibles du modèle Prisma
`Unsupported(...)`, donc "absents" du point de vue du diff). **Ces deux lignes ont été retirées
manuellement avant application** — sans quoi la migration aurait supprimé un index de production
existant sans raison. Migration finale appliquée :
`prisma/migrations/20260908235614_add_fuel_record_client_event_id_and_alert_indexes/migration.sql` —
```sql
ALTER TABLE "fuel_records" ADD COLUMN "clientEventId" TEXT;
CREATE INDEX "alerts_type_idx" ON "alerts"("type");
CREATE INDEX "alerts_level_idx" ON "alerts"("level");
CREATE INDEX "alerts_status_idx" ON "alerts"("status");
CREATE INDEX "alerts_status_createdAt_idx" ON "alerts"("status", "createdAt");
CREATE UNIQUE INDEX "fuel_records_clientEventId_key" ON "fuel_records"("clientEventId");
```
Appliquée via `docker exec -i tracking-vehicles-postgres-1 psql -U postgres -d tracking_vehicles`
(pas de `psql` client local disponible dans ce shell), puis `prisma migrate resolve --applied` +
`prisma generate`. Reproductible en CI par un futur agent avec le même contournement.

## 4. Optimisations légères (section 17)

- **Index `Alert`** ajoutés : `type`, `level`, `status`, `status+createdAt` (composite). Avant cette
  phase, seuls `vehicleId`/`driverId`/`missionId` avaient un index — `GET /alerts` et
  `GET /reports/*` filtrent aussi par `type`/`level`/`status`, et le cas d'usage dashboard le plus
  fréquent ("file d'alertes non traitées, plus récentes en premier") est exactement
  `WHERE status = ? ORDER BY createdAt DESC`, d'où l'index composite dédié plutôt que deux index
  simples que Postgres devrait combiner.
- **Partitionnement `gps_positions`** — TODO déjà présent depuis la Phase 1/3 sur le modèle Prisma.
  **Non implémenté ici** : c'est un changement de stockage structurant (recréation de table en
  partition native Postgres `PARTITION BY RANGE (recordedAt)`, migration des données existantes,
  re-vérification de tous les chemins de lecture/écriture — `tracking.service.ts`,
  `reports.service.ts#gpsRows`, les traces GeoJSON) qui n'aurait pas pu être fait et vérifié en
  sécurité dans le temps de cette phase, avec le risque de casser une table déjà utilisée par les
  fonctionnalités temps réel en production. Plan concret documenté plutôt qu'un TODO nu :
  1. Créer `gps_positions_new` comme table partitionnée par mois
     (`PARTITION BY RANGE (recorded_at)`), avec une partition par mois glissant (ex : job mensuel ou
     `pg_partman` pour l'automatiser) — au moins 3 mois à l'avance créés en avance.
  2. Copier les données existantes par lot (`INSERT ... SELECT` par tranche de date, pas un `INSERT`
     unique sur toute la table — éviter un verrou long sur une table en écriture continue).
  3. Bascule via `ALTER TABLE gps_positions RENAME TO gps_positions_old; ALTER TABLE
     gps_positions_new RENAME TO gps_positions;` dans une fenêtre de maintenance courte (les deux
     renames sont quasi instantanés, contrairement à la copie).
  4. Recréer les contraintes/index (`clientEventId` unique, index GiST `geom`, index `vehicleId`)
     sur chaque partition ou globalement selon le support Postgres 16 (`postgis:16-3.4`, déjà en
     usage).
  5. Politique de rétention : purger/archiver (vers S3/MinIO en Parquet/CSV) les partitions au-delà
     de N mois, une fois le volume réel et les besoins réglementaires de conservation connus — pas
     décidé arbitrairement ici.
  Déclenchement recommandé : une fois un volume réel observé en production (le schéma actuel tient
  largement en dessous du seuil où le partitionnement devient nécessaire pour les volumes de test/
  démo actuels).

## 5. Tests — gaps comblés (section 21 / section 18)

Rappel de ce qui existait déjà avant cette phase (Phases 1-4, 64 tests) : OTP incorrect/expiré/trop
de tentatives, mission complétée correctement, mauvais QR, chauffeur hors zone (véhicule), photo
manquante, position dupliquée, véhicule hors ligne, saut GPS impossible, odomètre carburant
incorrect, RolesGuard unitaire (`roles.guard.spec.ts`).

Gaps identifiés et comblés dans `src/common/security-e2e.spec.ts` (8 tests, boot de l'**application
complète** via `Test.createTestingModule({ imports: [AppModule] })` + `supertest`, pas des unités
isolées — pour vérifier le comportement HTTP réel guard par guard, dans l'ordre réel
Throttler → Jwt → Roles) :

| Test | Ce qu'il vérifie et pourquoi ce n'était pas déjà couvert |
|---|---|
| 401 sans token sur `reports`/`alerts`/`fuel-records` | `roles.guard.spec.ts` teste `RolesGuard` en isolation (mock de `Reflector`) — jamais `JwtAuthGuard` réellement appliqué sur une requête HTTP sans token |
| 403 chauffeur (DRIVER) sur 3 endpoints ADMIN-only | Confirme le refus RBAC de bout en bout avec un VRAI token JWT chauffeur (obtenu via le flux OTP réel), pas un objet `user` simulé |
| 401 avec JWT invalide/mal formé | `JwtAuthGuard` rejette bien un token qui ne vérifie pas la signature |
| 400 : téléphone hors format E.164 | `ValidationPipe` globale appliquée réellement (pas juste la règle `class-validator` testée isolément) |
| 400 : champ requis manquant | idem |
| 400 : champ non attendu (`isAdmin: true`) | `whitelist`/`forbidNonWhitelisted` réellement actifs bout en bout — un payload avec un champ en plus (tentative d'injection de champ non prévu) est bien rejeté, pas silencieusement ignoré |
| 400 : valeur d'enum invalide | idem, sur un DTO avec `@IsEnum` |
| 429 après la limite globale sur `otp/request` | **`ThrottlerGuard` était configuré (`CommonModule`, 100 req/60s) mais jamais vérifié comme réellement actif** — ce test envoie jusqu'à 110 requêtes réelles (numéros différents pour ne pas se heurter d'abord au cooldown métier OTP) et confirme qu'un `429` apparaît |

Pas de test ajouté sur les cas déjà couverts explicitement par l'énoncé de la tâche (OTP, QR, GPS,
carburant, hors ligne) — objectif "combler de vrais trous", pas gonfler un chiffre.

**Total suite complète : 79/79 tests passants** (64 avant Phase 5 + 15 nouveaux : 1 idempotence fuel,
6 reports, 8 sécurité e2e), DB/Redis/MinIO réels via `docker compose ps` (ports 5434/6380/9000-9001).

Sanity-check manuel : `npm run start:dev` démarre sans erreur, toutes les routes (dont
`ReportsController` : `/reports/missions`, `/reports/fuel`, `/reports/gps-positions`) sont mappées
dans les logs, `GET /api/docs` répond 200 et `GET /api/docs-json` liste bien les 3 endpoints
`reports/*`. Serveur arrêté après vérification.

## 6. Dépendances ajoutées
```
exceljs   — génération XLSX (src/reports/export/xlsx.util.ts)
pdfkit    — génération PDF (src/reports/export/pdf.util.ts)
@types/pdfkit (devDependency)
```
Pas de dépendance ajoutée pour le CSV (sérialisation maison, ~15 lignes, l'échelle ne justifiait pas
`json2csv`/`papaparse`).

## Ce qui reste pour une vraie mise en production

Cette phase est la dernière planifiée — honnêteté sur les limites plutôt qu'une image de complétude :

- **Pagination des rapports** : `REPORT_MAX_ROWS = 5000` est un plafond dur, pas une pagination. Un
  historique de plusieurs mois sur `gps-positions` dépassera ce plafond silencieusement (le rapport
  renvoie les 5000 lignes les plus récentes sans le signaler explicitement dans le corps de la
  réponse). À corriger avant un usage réel : soit une vraie pagination par curseur, soit au minimum
  un indicateur explicite `truncated: true` dans la réponse.
- **Partitionnement `gps_positions`** : plan documenté (§4), non implémenté — voir justification.
- **Géofencing / zone** : toujours absent (déjà noté Phase 3/4). Bloque le filtre "zone" des rapports
  et le signal de suspicion "chauffeur hors zone" (+30 pts).
- **`clientEventId` fuel côté mobile** : le champ existe côté API (optionnel, non cassant) mais
  `apps/mobile/` n'a pas été modifié pour l'envoyer (hors périmètre de cet agent) — l'idempotence
  n'est donc pas encore exploitée en pratique tant que l'app mobile n'envoie pas ce champ.
- **Rapports PDF** : mise en page volontairement minimale (tableau simple, pas de logo/en-tête
  d'organisation, pas de pagination des colonnes si trop nombreuses) — suffisant pour un export
  fonctionnel, pas pour un document destiné à être imprimé/archivé tel quel.
- **Notifications push (FCM)** : toujours non implémenté (déjà noté Phase 4).
- **TLS/scaling multi-instance** : hors périmètre backend, voir la documentation de l'agent
  infrastructure (`docs/DEPLOYMENT.md`).
