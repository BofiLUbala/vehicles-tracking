-- Précision GPS (mètres) de la dernière position connue par véhicule.
--
-- La tuile "Précision GPS" du panneau véhicule de l'écran admin de suivi en temps réel
-- affichait une valeur codée en dur (12 m) faute de champ exploitable. Cette colonne
-- alimente `GET /tracking/vehicles/live` et `GET /tracking/vehicles/:id/latest` avec la
-- vraie précision transmise par l'application chauffeur dans `CreatePositionDto.accuracy`.
-- La valeur est mise à jour au même moment que l'upsert de la position courante.
ALTER TABLE "vehicle_latest_positions" ADD COLUMN "accuracy" DOUBLE PRECISION;