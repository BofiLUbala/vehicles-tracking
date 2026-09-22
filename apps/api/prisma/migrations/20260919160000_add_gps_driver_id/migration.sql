-- PRIMARY ARCHITECTURE : une position GPS doit être associée au chauffeur authentifié qui l'a
-- émise (même driverId que le compte mobile, l'administration, la mission et le véhicule).
-- Colonne NULLable : la contrainte d'intégrité provient de la couche API (driverId dérivé du JWT)
-- et les éventuelles positions sans mission restent attribuables au chauffeur.
ALTER TABLE "gps_positions" ADD COLUMN "driverId" TEXT;

-- Rétro-remplissage : pour les positions déjà liées à une mission, on reprend le driverId de la
-- mission (invariant déjà garanti côté serveur : mission.driverId == chauffeur du JWT).
UPDATE "gps_positions" g
SET "driverId" = m."driverId"
FROM "missions" m
WHERE g."missionId" = m."id" AND g."driverId" IS NULL;

CREATE INDEX "gps_positions_driverId_idx" ON "gps_positions"("driverId");

ALTER TABLE "gps_positions" ADD CONSTRAINT "gps_positions_driverId_fkey"
  FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;