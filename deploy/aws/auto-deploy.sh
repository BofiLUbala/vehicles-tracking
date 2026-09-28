#!/usr/bin/env bash
# Mise à jour automatique de l'API sur le serveur (lancé par cron toutes les 2 minutes).
#
#   1. tire l'image `latest` publiée par GitHub Actions (.github/workflows/deploy-api.yml) ;
#   2. si elle a changé : redémarre l'api (les migrations Prisma s'exécutent au démarrage du
#      conteneur) et attend qu'elle soit saine ;
#   3. si elle ne devient pas saine : retour automatique à l'image précédente.
#
# Idempotent et sans effet quand rien n'a changé. Journal : ~/auto-deploy.log
set -euo pipefail

cd "$(dirname "$0")"
LOCK=/tmp/tracking-auto-deploy.lock
exec 9>"$LOCK"
flock -n 9 || exit 0 # un déploiement est déjà en cours

C="docker compose -f docker-compose.yml --env-file .env"
# Image du service api lue dans le compose (`config --images` liste TOUS les services).
IMAGE=$(awk '/^  api:/{f=1;next} f&&/^  [a-z]/{exit} f&&$1=="image:"{print $2;exit}' docker-compose.yml)
[ -n "$IMAGE" ] || { echo "$(date -Is) image api introuvable dans docker-compose.yml"; exit 1; }
log() { echo "$(date -Is) $*"; }

current=$(docker image inspect --format '{{.Id}}' "$IMAGE" 2>/dev/null || echo none)
if ! docker pull -q "$IMAGE" >/dev/null 2>&1; then
  log "pull impossible ($IMAGE) — on réessaiera"
  exit 0
fi
latest=$(docker image inspect --format '{{.Id}}' "$IMAGE")
running=$($C ps -q api | xargs -r docker inspect --format '{{.Image}}' 2>/dev/null || echo none)

[ "$latest" = "$running" ] && exit 0
# Image déjà essayée et rejetée : on attend la prochaine publication au lieu de boucler.
FAILED=~/.auto-deploy-failed
[ -f "$FAILED" ] && [ "$(cat "$FAILED")" = "$latest" ] && exit 0

log "nouvelle image $latest (en service : $running) — déploiement"
[ "$running" != none ] && docker tag "$running" "${IMAGE%:*}:previous"
$C up -d --no-build api

for _ in $(seq 1 30); do # jusqu'à 5 min (migrations comprises)
  sleep 10
  state=$(docker inspect --format '{{.State.Health.Status}}' "$($C ps -q api)" 2>/dev/null || echo unknown)
  if [ "$state" = healthy ]; then
    log "api saine — déploiement terminé"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
done

log "api non saine après 5 min — retour à l'image précédente"
echo "$latest" > "$FAILED"
if docker image inspect "${IMAGE%:*}:previous" >/dev/null 2>&1; then
  docker tag "${IMAGE%:*}:previous" "$IMAGE"
  $C up -d --no-build api
fi
exit 1
