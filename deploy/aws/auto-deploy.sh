#!/usr/bin/env bash
# Exploitation automatique du serveur (cron toutes les 2 minutes, journal ~/auto-deploy.log).
#
#   1. Configuration : si `main` a changé sur GitHub, récupère deploy/aws (compose, Caddyfile,
#      scripts, pages publiques), la valide, l'applique, vérifie que tout est sain — sinon
#      remet l'ancienne configuration. Plus aucune intervention manuelle pour l'infra.
#   2. Applications : tire les images `latest` publiées par GitHub Actions (api, admin) ;
#      redémarre celles qui ont changé (migrations Prisma au démarrage de l'api), attend
#      qu'elles soient saines, sinon retour à l'image précédente.
#   3. Tâches planifiées : s'assure que la sauvegarde quotidienne (backup.sh) est programmée.
#
# Idempotent et sans effet quand rien n'a changé.
set -euo pipefail

cd "$(dirname "$0")"
LOCK=/tmp/tracking-auto-deploy.lock
exec 9>"$LOCK"
flock -n 9 || exit 0 # un déploiement est déjà en cours

REPO=BofiLUbala/vehicles-tracking
CONFIG_FILES="docker-compose.yml Caddyfile auto-deploy.sh backup.sh public/privacy/index.html"
C="docker compose -f docker-compose.yml --env-file .env"
log() { echo "$(date -Is) $*"; }
rc=0

# Attend que tous les services soient sains (ou simplement démarrés s'ils n'ont pas de
# healthcheck), au plus ~3 minutes.
wait_all_healthy() {
  local id state bad
  for _ in $(seq 1 18); do
    sleep 10
    bad=0
    for id in $($C ps -q); do
      state=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id" 2>/dev/null || echo unknown)
      case "$state" in healthy|running) ;; *) bad=1 ;; esac
    done
    [ "$bad" = 0 ] && return 0
  done
  return 1
}

apply_stack() {
  $C up -d --no-build --pull missing --remove-orphans
  # Caddyfile monté en fichier : réécrit sur place (même inode), puis rechargé sans coupure.
  $C exec -T caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 \
    || $C restart caddy
}

sync_config() {
  local sha tmp f changed=0 backup
  sha=$(curl -fsSL -H 'Accept: application/vnd.github.sha' "https://api.github.com/repos/$REPO/commits/main" 2>/dev/null) || return 0
  [ -n "$sha" ] || return 0
  [ -f ~/.deployed-config-sha ] && [ "$(cat ~/.deployed-config-sha)" = "$sha" ] && return 0

  tmp=$(mktemp -d)
  for f in $CONFIG_FILES; do
    mkdir -p "$tmp/$(dirname "$f")"
    if ! curl -fsSL "https://raw.githubusercontent.com/$REPO/$sha/deploy/aws/$f" -o "$tmp/$f"; then
      log "config : téléchargement de $f impossible — on réessaiera"
      rm -rf "$tmp"; return 0
    fi
  done
  for f in $CONFIG_FILES; do cmp -s "$tmp/$f" "$f" 2>/dev/null || changed=1; done
  if [ "$changed" = 0 ]; then echo "$sha" > ~/.deployed-config-sha; rm -rf "$tmp"; return 0; fi

  # Validation AVANT d'appliquer : compose et Caddyfile doivent être corrects.
  if ! docker compose -f "$tmp/docker-compose.yml" --project-directory . --env-file .env config -q 2>/dev/null; then
    log "config $sha : docker-compose.yml invalide — ignorée"
    echo "$sha" > ~/.deployed-config-sha; rm -rf "$tmp"; return 1
  fi
  if ! docker run --rm -e API_DOMAIN=a.example -e FILES_DOMAIN=f.example -e ADMIN_DOMAIN=d.example \
      -v "$tmp/Caddyfile":/etc/caddy/Caddyfile:ro caddy:2-alpine \
      caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
    log "config $sha : Caddyfile invalide — ignorée"
    echo "$sha" > ~/.deployed-config-sha; rm -rf "$tmp"; return 1
  fi

  backup=~/config-backup/$(date +%F-%H%M%S)
  mkdir -p "$backup"
  for f in $CONFIG_FILES; do
    [ -f "$f" ] || continue
    mkdir -p "$backup/$(dirname "$f")"; cp -p "$f" "$backup/$f"
  done

  log "config $sha : application (ancienne configuration sauvegardée dans $backup)"
  for f in $CONFIG_FILES; do
    mkdir -p "$(dirname "$f")"
    case "$f" in
      Caddyfile) cat "$tmp/$f" > "$f" ;;               # même inode (fichier monté dans caddy)
      *) cp "$tmp/$f" "$f.new" && mv "$f.new" "$f" ;;  # remplacement atomique (ce script inclus)
    esac
  done
  rm -rf "$tmp"
  chmod +x auto-deploy.sh backup.sh
  apply_stack

  if wait_all_healthy; then
    log "config $sha : appliquée, tous les services sont sains"
    echo "$sha" > ~/.deployed-config-sha
    return 0
  fi

  log "config $sha : services non sains — retour à la configuration précédente"
  for f in $CONFIG_FILES; do
    [ -f "$backup/$f" ] || continue
    case "$f" in Caddyfile) cat "$backup/$f" > "$f" ;; *) cp -p "$backup/$f" "$f" ;; esac
  done
  apply_stack
  echo "$sha" > ~/.deployed-config-sha # ne pas réessayer en boucle la même configuration
  return 1
}

# Met à jour UN service (api, admin) si son image publiée a changé ; rollback s'il n'est pas sain.
deploy_service() {
  local svc=$1 IMAGE latest running state FAILED
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

# Tâches planifiées gérées ici (idempotent) : exploitation toutes les 2 min, sauvegarde à 02:30 UTC.
ensure_cron() {
  local want current
  want=$(printf '%s\n' \
    "*/2 * * * * $(pwd)/auto-deploy.sh >> $HOME/auto-deploy.log 2>&1" \
    "30 2 * * * $(pwd)/backup.sh >> $HOME/backup.log 2>&1")
  current=$(crontab -l 2>/dev/null || true)
  if [ "$(printf '%s\n' "$current" | grep -E 'auto-deploy.sh|backup.sh' || true)" != "$want" ]; then
    { printf '%s\n' "$current" | grep -vE 'auto-deploy.sh|backup.sh|^$' || true; printf '%s\n' "$want"; } | crontab -
    log "cron : tâches planifiées mises à jour"
  fi
}

sync_config || rc=1
for svc in api admin; do
  deploy_service "$svc" || rc=1
done
ensure_cron
docker image prune -f >/dev/null 2>&1 || true
exit $rc
