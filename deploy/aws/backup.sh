#!/usr/bin/env bash
# Sauvegarde quotidienne de la production (cron installé automatiquement par auto-deploy.sh).
#
#   - Postgres/PostGIS : pg_dump au format custom (restaurable avec pg_restore) ;
#   - MinIO (photos, reçus) : archive du volume de données ;
#   - rotation : on garde BACKUP_KEEP_DAYS jours (14 par défaut) dans ~/backups ;
#   - copie hors serveur si BACKUP_S3_BUCKET est défini dans .env (rôle IAM de l'instance
#     autorisé à écrire dans ce bucket) : sans lui, les sauvegardes restent locales.
#
# Restauration Postgres :
#   docker compose -f docker-compose.yml --env-file .env exec -T postgres \
#     pg_restore -U postgres -d tracking_vehicles --clean --if-exists < ~/backups/<fichier>.dump
set -euo pipefail

cd "$(dirname "$0")"
exec 8>/tmp/tracking-backup.lock
flock -n 8 || exit 0

C="docker compose -f docker-compose.yml --env-file .env"
DIR="$HOME/backups"
STAMP=$(date -u +%Y-%m-%dT%H%MZ)
KEEP_DAYS=$(grep -E '^BACKUP_KEEP_DAYS=' .env 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
BUCKET=$(grep -E '^BACKUP_S3_BUCKET=' .env 2>/dev/null | cut -d= -f2 | tr -d '\r' || true)
KEEP_DAYS=${KEEP_DAYS:-14}
log() { echo "$(date -Is) backup: $*"; }
mkdir -p "$DIR"

# 1. Base de données (écriture dans un fichier temporaire : jamais de sauvegarde tronquée).
PG="$DIR/postgres-$STAMP.dump"
$C exec -T postgres pg_dump -U postgres -d tracking_vehicles -Fc > "$PG.part"
mv "$PG.part" "$PG"
# Contrôle d'intégrité : l'archive doit être lisible par pg_restore.
$C exec -T postgres pg_restore --list < "$PG" > /dev/null
log "postgres OK ($(du -h "$PG" | cut -f1))"

# 2. Fichiers MinIO (volume Docker du service minio).
VOL=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$($C ps -q minio)")
MINIO="$DIR/minio-$STAMP.tgz"
docker run --rm -v "$VOL":/data:ro -v "$DIR":/backup postgis/postgis:16-3.4 \
  tar czf "/backup/$(basename "$MINIO").part" -C /data .
mv "$MINIO.part" "$MINIO"
log "minio OK ($(du -h "$MINIO" | cut -f1))"

# 3. Rotation locale.
find "$DIR" -maxdepth 1 -type f \( -name 'postgres-*.dump' -o -name 'minio-*.tgz' \) -mtime +"$KEEP_DAYS" -delete

# 4. Copie hors serveur (facultative).
if [ -n "$BUCKET" ]; then
  if docker run --rm -v "$DIR":/backup:ro amazon/aws-cli s3 cp /backup/ "s3://$BUCKET/backups/" \
      --recursive --exclude '*' --include "*-$STAMP.*" --only-show-errors; then
    log "copie S3 OK (s3://$BUCKET/backups/)"
  else
    log "copie S3 ÉCHOUÉE — sauvegarde locale conservée"
    exit 1
  fi
fi
