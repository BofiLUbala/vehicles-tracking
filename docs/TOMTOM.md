# Intégration TomTom

TomTom fournit **uniquement** : fond de carte, itinéraire planifié (optionnel), recalage sur route
(optionnel), trafic (optionnel). Le suivi reste 100 % à nous :

```
GPS mobile → SQLite locale → NestJS → PostGIS → Socket.IO → carte (fond TomTom)
```

Une panne TomTom n'interrompt jamais la collecte GPS : la carte affiche un bandeau d'erreur et
les contrôles de mission restent utilisables.

## Variables d'environnement (placeholders uniquement — ne jamais committer de vraie clé)

| Variable | Utilisée par | Nature | Rôle |
|---|---|---|---|
| `TOMTOM_API_KEY` | `apps/api/.env` | **Secret serveur** | Routing + Snap to Roads (`TomTomService`) |
| `TOMTOM_TIMEOUT_MS` | `apps/api/.env` | Config | Délai des appels TomTom (défaut 8000) |
| `NEXT_PUBLIC_TOMTOM_API_KEY` | `apps/admin-web/.env.local` | **Clé client (publique)** | Fond de carte + trafic |
| `NEXT_PUBLIC_TOMTOM_STYLE_VERSION` | `apps/admin-web` | Config | Version de ressource du style TomTom (défaut `24.*`, joker documenté) |
| `EXPO_PUBLIC_TOMTOM_API_KEY` | `apps/mobile/.env` | **Clé client (publique)** | Fond de carte |

Les clés `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` finissent dans le bundle navigateur / l'APK : ce sont des
clés client. Utiliser une clé **distincte** de la clé serveur, restreinte dans le portail TomTom
(produit Map Display, liste de domaines pour le web). Sans clé client, les cartes retombent sur
OpenFreeMap. Sans `TOMTOM_API_KEY`, `/planned-route` et `/trace/snapped` répondent `503`.

Docker : `NEXT_PUBLIC_TOMTOM_API_KEY` est un `ARG` de build de `apps/admin-web/Dockerfile`.
EAS : `eas secret:create --name EXPO_PUBLIC_TOMTOM_API_KEY`.

## Backend (`apps/api/src/tomtom`, `tracking/mission-geo.*`)

- `TomTomService` est le seul point d'appel TomTom : timeout, 2 relances **uniquement** sur
  timeout/5xx/réseau (jamais 400/401/403/429), erreurs typées, cache mémoire 1 h, clé jamais
  journalisée ni renvoyée.
- `GET /tracking/missions/:id/planned-route` (admin) et `GET /mobile/missions/:id/planned-route`
  (chauffeur, scopé par JWT) : itinéraire planifié entre les étapes ordonnées.
- `GET /tracking/missions/:id/trace/snapped` (admin) : trace recalée sur route, un seul appel batch.
  Réponse marquée `derived: true` ; les positions brutes en base ne sont **jamais** modifiées.
- Coût : aucun appel n'est lié à l'ingestion GPS. Le routage est appelé à la demande (mission
  consultée), une fois par géométrie d'étapes (cache).

## Admin web

Les cartes MapLibre existantes gardent leur code ; `features/geo/map-style.ts` fournit le style
TomTom. Trafic optionnel (bouton), bandeau d'erreur si tuiles/clé refusées, recentrage sur le
véhicule sélectionné, itinéraire planifié en pointillés orange **distinct** de la trace bleue.

## Mobile

`react-native-maps` (Google sur Android) est remplacé par `TomTomMapView` : MapLibre GL JS dans une
`react-native-webview`. Plus aucune clé Google requise. Suivi automatique, recentrage manuel, zoom.
Limite connue : la bibliothèque MapLibre est chargée depuis jsDelivr ; hors ligne, la carte affiche
le bandeau d'erreur (le GPS continue).

## Non vérifié sans clé

Les URL de style/trafic, la requête Snap to Roads et les endpoints ci-dessus sont couverts par des
tests avec HTTP simulé ; aucun appel réel à TomTom n'a été exécuté depuis cet environnement.
