# Adresse publique de l'admin web

| Adresse | Rôle |
|---|---|
| `https://track.<sous-domaine>.workers.dev` | **Le lien à utiliser et à partager** (Worker Cloudflare `track`, HTTPS). |
| `https://admin.46-137-0-222.sslip.io` | Origine technique sur l'EC2 (Caddy), que le Worker relaie. Ne pas diffuser. |

Le Worker (`worker.js`) relaie tout vers l'origine : pages de l'admin, `/api/v1` et Socket.IO
(suivi temps réel). L'application mobile n'est pas concernée : elle appelle l'API directement.

Déploiement : automatique à chaque push sur `main` touchant ce dossier
(`.github/workflows/deploy-edge.yml`, secrets `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`).
