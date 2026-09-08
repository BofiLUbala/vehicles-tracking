-- Migration manuscrite : PostGIS n'est pas modélisé nativement par Prisma (colonnes `geom`
-- déclarées via Unsupported(...) dans schema.prisma), donc l'extension et les index spatiaux
-- doivent être ajoutés en SQL brut. `geom` est renseignée depuis latitude/longitude via
-- $executeRaw au moment de l'écriture (voir LocationsService.setGeom ; même motif à réutiliser
-- pour gps_positions en Phase 3).

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS locations_geom_gist_idx ON locations USING GIST (geom);
CREATE INDEX IF NOT EXISTS gps_positions_geom_gist_idx ON gps_positions USING GIST (geom);
