#!/usr/bin/env bash
# Restaure la base Postgres (service `postgres` de docker-compose.yml) à partir d'un fichier
# produit par backup.sh (.sql.gz ou .sql brut).
#
# Usage :
#   ./infrastructure/scripts/restore.sh <fichier-backup> [nom-projet-docker-compose]
#
# ATTENTION : cette opération DROP puis recrée la base cible avant restauration — destructif,
# toutes les données actuelles de la base sont perdues. Confirmation interactive requise sauf
# si FORCE=1 est positionné (utile en script/CI, jamais en prod sans y avoir réfléchi).
#
# Variables d'environnement optionnelles :
#   POSTGRES_USER  (défaut: postgres)
#   POSTGRES_DB    (défaut: tracking_vehicles)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_FILE="${1:-}"
PROJECT_NAME="${2:-$(basename "$REPO_ROOT")}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-tracking_vehicles}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Usage : $0 <fichier-backup> [nom-projet-docker-compose]" >&2
  exit 1
fi
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Erreur : fichier introuvable : $BACKUP_FILE" >&2
  exit 1
fi

CONTAINER="${PROJECT_NAME}-postgres-1"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Erreur : le conteneur '$CONTAINER' n'est pas en cours d'exécution." >&2
  exit 1
fi

if [[ "${FORCE:-0}" != "1" ]]; then
  read -r -p "Ceci va DÉTRUIRE puis recréer la base '$POSTGRES_DB' sur $CONTAINER avant restauration depuis $BACKUP_FILE. Continuer ? [y/N] " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Annulé."
    exit 1
  fi
fi

echo "Suppression puis recréation de la base '$POSTGRES_DB' ..."
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$POSTGRES_DB\";"
docker exec "$CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"$POSTGRES_DB\";"

echo "Restauration depuis $BACKUP_FILE ..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
  docker exec -i "$CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
fi

echo "Restauration terminée."
echo "Pensez à réappliquer l'extension PostGIS si le dump ne la recréait pas déjà :"
echo "  docker exec $CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB -c 'CREATE EXTENSION IF NOT EXISTS postgis;'"
