-- Migration manuscrite de réparation.
--
-- La migration précédente (`add_zones_geofencing`) a été générée par `prisma migrate dev`, qui ne
-- connaît pas les index créés en SQL brut dans `20260908130100_postgis_gist_indexes` : Prisma les a
-- considérés comme une dérive et a émis un `DROP INDEX` pour chacun. Ils sont recréés ici, et
-- l'index spatial de la nouvelle table `zones` est ajouté au passage.
--
-- Toute future migration générée qui contiendrait à nouveau un `DROP INDEX ..._geom_gist_idx` doit
-- être corrigée AVANT d'être appliquée : ces index ne sont pas de la dérive, ils sont voulus.

CREATE INDEX IF NOT EXISTS locations_geom_gist_idx ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS gps_positions_geom_gist_idx ON gps_positions USING GIST (geom);
CREATE INDEX IF NOT EXISTS zones_geom_gist_idx ON zones USING GIST (geom);
