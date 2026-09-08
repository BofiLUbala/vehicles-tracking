# Mobile — Flutter (application chauffeur)

Application unique Android/iOS pour les chauffeurs.

## Stack
Flutter, Dart, Riverpod, Dio, Drift (SQLite), Geolocator + service de
localisation en arrière-plan, Mobile Scanner (QR), Camera, Socket.IO Client,
Flutter Secure Storage, Firebase Cloud Messaging, MapLibre Flutter (si carte).

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

## Commandes
```bash
flutter pub get
flutter run
flutter test
```
