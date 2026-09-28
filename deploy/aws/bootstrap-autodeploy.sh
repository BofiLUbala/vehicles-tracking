#!/usr/bin/env bash
# À lancer UNE SEULE FOIS sur le serveur EC2 pour activer le déploiement automatique :
#   cd ~/tracking-vehicles && bash deploy/aws/bootstrap-autodeploy.sh
# Ensuite, chaque push sur main est déployé sans intervention (voir deploy/aws/auto-deploy.sh).
set -euo pipefail
cd "$(dirname "$0")"
chmod +x auto-deploy.sh

LINE="*/2 * * * * $(pwd)/auto-deploy.sh >> $HOME/auto-deploy.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'auto-deploy.sh' ; echo "$LINE" ) | crontab -
echo "cron installé :"
crontab -l | grep auto-deploy.sh

# Premier passage immédiat (tire l'image GHCR et bascule dessus si elle est plus récente).
./auto-deploy.sh || true
tail -n 5 "$HOME/auto-deploy.log" 2>/dev/null || true
