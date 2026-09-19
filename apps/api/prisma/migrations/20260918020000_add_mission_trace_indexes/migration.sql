-- Index composés pour le tracé de trajet par mission.
--
-- La consultation `GET /tracking/missions/:id/trace` interroge `gps_positions` par
-- `missionId` ordonné par `recordedAt`. L'index simple existant sur `missionId` puis
-- sur `recordedAt` ne permet pas une élimination d'index efficace : Postgres ne peut
-- pas combiner deux index index-scans pour satisfaire `WHERE missionId = ? ORDER BY recordedAt`.
-- Un index composé `(missionId, recordedAt)` répond à cette requête en lecture seule d'index.
--
-- L'index composé `(vehicleId, recordedAt)` sert la trace véhicule avec filtre temporel
-- (`GET /tracking/vehicles/:id/trace?from=&to=`).

-- Colonnes camelCase (convention Prisma sans @map), inchangées ici.
CREATE INDEX IF NOT EXISTS gps_positions_missionId_recordedAt_idx ON gps_positions ("missionId", "recordedAt");
CREATE INDEX IF NOT EXISTS gps_positions_vehicleId_recordedAt_idx ON gps_positions ("vehicleId", "recordedAt");