#!/usr/bin/env bash
# Sauvegarde la base Postgres (service `postgres` de docker-compose.yml) dans un fichier
# horodaté sous infrastructure/backups/.
#
# Usage :
#   ./infrastructure/scripts/backup.sh [nom-projet-docker-compose]
#
# Par défaut, cible le conteneur `<projet>-postgres-1` du projet docker-compose courant
# (déduit du nom de dossier, ex: `tracking-vehicles`, comme docker compose le fait par défaut).
# Passez un nom de projet explicite si vous utilisez `docker compose -p <nom>` (ex: le
# `prod-check` utilisé pour valider docker-compose.yml sans toucher aux conteneurs de dev).
#
# Variables d'environnement optionnelles :
#   POSTGRES_USER  (défaut: postgres)
#   POSTGRES_DB    (défaut: tracking_vehicles)
#   BACKUP_DIR     (défaut: infrastructure/backups, relatif à la racine du repo)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

PROJECT_NAME="${1:-$(basename "$REPO_ROOT")}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-tracking_vehicles}"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/infrastructure/backups}"

CONTAINER="${PROJECT_NAME}-postgres-1"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Erreur : le conteneur '$CONTAINER' n'est pas en cours d'exécution." >&2
  echo "Conteneurs postgres actuellement démarrés :" >&2
  docker ps --format '  - {{.Names}}' | grep postgres >&2 || echo "  (aucun)" >&2
  echo "Astuce : passez le nom du projet docker-compose en argument, ex. '$0 tracking-vehicles'." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Sauvegarde de la base '$POSTGRES_DB' (conteneur $CONTAINER) vers $OUT_FILE ..."
docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Terminé : $OUT_FILE ($SIZE)"
