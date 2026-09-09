# infrastructure

| Dossier | Contenu |
|---|---|
| docker | Fichiers Docker additionnels (ex. images de base communes) — vide pour l'instant, les `Dockerfile` de chaque app vivent dans `apps/*/Dockerfile` |
| nginx | Configuration reverse-proxy (`default.conf`) — routage `/api/*`, `/socket.io/*`, `/*` + gabarit HTTPS commenté |
| github-actions | Pointeur historique — le workflow CI réel est `.github/workflows/ci.yml` (seul chemin lu par GitHub Actions) |
| scripts | `backup.sh` / `restore.sh` — sauvegarde et restauration de la base Postgres via `docker exec` |
| backups | Emplacement local des sauvegardes (ignoré par git, sauf `.gitkeep`) |

Voir `docs/DEPLOYMENT.md` pour le guide de déploiement complet (lancement de la stack, graphe de
dépendances/healthchecks, sauvegarde/restauration, référence des variables d'environnement,
différences dev/test/prod, limites connues).
