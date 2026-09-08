# Mobile — Flutter (application chauffeur)

Application unique Android/iOS pour les chauffeurs.

## Stack

Phase 2 (implémenté) : Flutter, Dart, Riverpod, Dio, go_router, Geolocator
(lecture ponctuelle de position), Mobile Scanner (QR), Camera, Flutter
Secure Storage, connectivity_plus, uuid, intl.

Phase 3+ (pas encore ajouté) : Drift/SQLite (file d'attente hors-ligne),
service de localisation en arrière-plan, Socket.IO Client (suivi temps
réel), Firebase Cloud Messaging (push), MapLibre Flutter (carte live).

## Structure (lib/)
| Dossier | Rôle |
|---|---|
| core | Config réseau (Dio), thème, routing, constantes, gestion des erreurs |
| features/auth | Connexion téléphone, OTP WhatsApp, session, permissions GPS |
| features/missions | Missions du jour, détail, démarrage, étapes |
| features/tracking | Collecte GPS arrière-plan, envoi positions |
| features/sync | File d'attente locale (Drift), statuts pending/uploading/synced/failed/conflict |
| features/fuel | Déclaration de plein, calcul consommation, preuves photo |
| features/qr | Scan QR, validation étape |
| features/history | Historique des missions et validations |
| shared | Widgets communs (gros boutons, indicateurs GPS/Internet/sync) |

## Écrans (voir section 19 du cahier des charges)
Démarrage → Connexion téléphone → OTP WhatsApp → Autorisations GPS →
Missions du jour → Détail mission → Démarrage → Progression → Scan QR →
Capture photo → Résultat validation → Déclaration carburant → Historique →
Synchronisations en attente → Profil/déconnexion.

## État — Phase 2 (missions, application chauffeur, QR, photos, validation GPS)

Implémenté : auth OTP WhatsApp (demande/vérification/renvoi + refresh
automatique du token via intercepteur Dio), permissions GPS, missions du
jour (liste + détail + démarrage + progression), flux Scan QR → Photo →
Validation avec résultat en français, profil/déconnexion. Voir
`docs/PHASES.md`.

Volontairement hors périmètre (Phase 3+) : file d'attente hors-ligne
(Drift/SQLite), GPS en arrière-plan, Socket.IO temps réel, notifications
push (FCM), déclaration carburant, historique, écran de synchronisation en
attente. Les repositories (`lib/features/*/data`) exposent une interface
simple pour pouvoir y brancher un cache local plus tard sans réécriture.

Le routeur (`lib/core/router/app_router.dart`, go_router) redirige
automatiquement selon l'état d'authentification (Riverpod) :
démarrage → connexion → OTP → (permissions GPS) → missions.

## Configuration

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://localhost:3001/api/v1
flutter test
flutter analyze
```

`API_BASE_URL` peut être défini à la compilation ; par défaut il pointe sur
l'API locale (`http://localhost:3001/api/v1`).

## Dossiers de plateforme (android/, ios/)

Ces dossiers n'existent pas encore dans ce dépôt et doivent être générés
avec `flutter create .` (à exécuter une fois le SDK Flutter disponible,
depuis `apps/mobile/`, sans écraser `lib/`, `pubspec.yaml` ni `test/`).
Une fois générés, ajoutez les permissions suivantes :

- **Android** (`android/app/src/main/AndroidManifest.xml`) :
  `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `CAMERA`, `INTERNET`.
- **iOS** (`ios/Runner/Info.plist`) :
  `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`
  (texte en français expliquant l'usage — cf. écran "Autorisations GPS").

## Tests

`flutter test` couvre : le notifier d'authentification (OTP → session,
erreurs), l'intercepteur Dio (refresh-on-401 + retry, échec → déconnexion
forcée), le mapping code d'erreur → message français de validation, et le
parsing JSON du repository missions. Le SDK Flutter n'était pas disponible
dans cet environnement au moment de l'implémentation — les tests n'ont donc
pas pu être exécutés ici ; à lancer dès que possible sur une machine avec
Flutter installé.
