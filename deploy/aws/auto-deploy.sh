#!/usr/bin/env bash
# Mise à jour automatique de l'api et de l'admin sur le serveur (cron toutes les 2 minutes).
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
log() { echo "$(date -Is) $*"; }
rc=0

# Met à jour UN service (api, admin) si son image publiée a changé ; rollback s'il n'est pas sain.
deploy_service() {
  local svc=$1 IMAGE current latest running state FAILED
  # Image du service lue dans le compose (`config --images` liste TOUS les services).
  IMAGE=$(awk -v s="  $svc:" '$0==s{f=1;next} f&&/^  [a-z]/{exit} f&&$1=="image:"{print $2;exit}' docker-compose.yml)
  [ -n "$IMAGE" ] || { log "$svc : image introuvable dans docker-compose.yml"; return 1; }

  if ! docker pull -q "$IMAGE" >/dev/null 2>&1; then
    log "$svc : pull impossible ($IMAGE) — on réessaiera"
    return 0
  fi
  latest=$(docker image inspect --format '{{.Id}}' "$IMAGE")
  running=$($C ps -q "$svc" | xargs -r docker inspect --format '{{.Image}}' 2>/dev/null || true)
  [ -n "$running" ] || running=none

  [ "$latest" = "$running" ] && return 0
  # Image déjà essayée et rejetée : on attend la prochaine publication au lieu de boucler.
  FAILED=~/.auto-deploy-failed-$svc
  [ -f "$FAILED" ] && [ "$(cat "$FAILED")" = "$latest" ] && return 0

  log "$svc : nouvelle image $latest (en service : $running) — déploiement"
  [ "$running" != none ] && docker tag "$running" "${IMAGE%:*}:previous"
  $C up -d --no-build "$svc"

  for _ in $(seq 1 30); do # jusqu'à 5 min (migrations comprises)
    sleep 10
    state=$(docker inspect --format '{{.State.Health.Status}}' "$($C ps -q "$svc")" 2>/dev/null || echo unknown)
    if [ "$state" = healthy ]; then
      log "$svc : sain — déploiement terminé"
      return 0
    fi
  done

  log "$svc : non sain après 5 min — retour à l'image précédente"
  echo "$latest" > "$FAILED"
  if docker image inspect "${IMAGE%:*}:previous" >/dev/null 2>&1; then
    docker tag "${IMAGE%:*}:previous" "$IMAGE"
    $C up -d --no-build "$svc"
  fi
  return 1
}

for svc in api admin; do
  deploy_service "$svc" || rc=1
done
docker image prune -f >/dev/null 2>&1 || true
exit $rc
