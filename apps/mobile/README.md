# Mobile — React Native / Expo (Application Chauffeur)

Application mobile unique Android/iOS pour les chauffeurs, développée avec **React Native**, **Expo SDK 52**, **TypeScript** et **Expo Router**.

---

## 🚀 Technologies

- **Framework** : React Native 0.76+, Expo SDK 52
- **Routage & Navigation** : `expo-router` (routage par fichiers typé)
- **Cible de Build** : Expo Development Build (`expo-dev-client`) & EAS Build (`eas.json`)
- **Stockage Sécurisé** : `expo-secure-store` (tokens JWT, refresh token rotation, profil chauffeur)
- **Base de Données Locale (Offline-first)** : `expo-sqlite` (files d'attente locales des positions GPS, validations et carburant)
- **Connectivité** : `@react-native-community/netinfo`
- **Localisation GPS** :
  - Premier plan : `expo-location`
  - Arrière-plan : `expo-location` + `expo-task-manager` avec notification de service de premier plan Android
- **Caméra & Scan QR** : `expo-camera` (scan de jeton HMAC + captures photo de preuve)
- **Réseau** : `axios` avec intercepteur de rafraîchissement automatique de token (401 mutex queue)
- **Temps Réel** : `socket.io-client` connecté au namespace `/tracking`

---

## 📁 Structure du Projet

```
apps/mobile/
├── app/                                # Écrans Expo Router
│   ├── _layout.tsx                     # Layout racine (Providers Auth, Sync, Tracking)
│   ├── index.tsx                       # Écran Splash / Redirection initiale
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                   # Connexion numéro téléphone (E.164)
│   │   └── otp.tsx                     # Validation code OTP WhatsApp
│   └── (main)/
│       ├── _layout.tsx                 # Layout principal avec ConnectivityPill
│       ├── permissions/gps.tsx         # Écran d'explication et demande des permissions GPS
│       ├── missions/
│       │   ├── index.tsx               # Tableau de bord chauffeur & missions du jour
│       │   ├── [id]/index.tsx          # Détail de la mission & étapes ordonnées
│       │   ├── [id]/progress.tsx       # Mission en cours & focus sur l'étape active
│       │   └── [id]/steps/[stepId]/
│       │       ├── scan.tsx            # Scanner QR Code caméra (CameraView)
│       │       ├── photo.tsx           # Capture photo de preuve + géolocalisation
│       │       └── result.tsx          # Résultat en français (succès, échec ou file hors ligne)
│       ├── fuel/
│       │   ├── index.tsx               # Formulaire déclaration carburant
│       │   ├── [vehicleId]/receipt-photo.tsx   # Photo 1/2 : Ticket/reçu de station
│       │   ├── [vehicleId]/odometer-photo.tsx  # Photo 2/2 : Compteur kilométrique & envoi
│       │   └── [vehicleId]/result.tsx          # Résultat / avertissements anomalies
│       ├── sync/index.tsx              # File d'attente de synchronisation hors-ligne
│       ├── history/index.tsx           # Historique des missions terminées du jour
│       └── profile/index.tsx           # Profil chauffeur & déconnexion
│
├── src/
│   ├── api/                            # Client Axios, intercepteur 401 & endpoints
│   ├── components/                     # Composants UI (BigButton, StatusBadge, ConnectivityPill, etc.)
│   ├── context/                        # AuthContext, SyncContext, TrackingContext
│   ├── database/                       # SQLite schema, tables & repositories de files d'attente
│   ├── services/                       # Services métier (Auth, Tracking, BackgroundLocation, Sync, WebSocket)
│   ├── theme/                          # Tokens de couleurs & typographie
│   ├── types/                          # Interfaces TypeScript partagées
│   └── utils/                          # Normalisation téléphone, traduction erreurs en français, env
│
├── assets/                             # Icônes & splash screen
├── app.json                            # Configuration Expo & permissions natives
├── eas.json                            # Profils de build EAS (development, preview, production)
├── package.json                        # Dépendances & scripts
└── tsconfig.json                       # Configuration TypeScript
```

---

## 🛠️ Commandes Disponibles

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement Metro
npm start
# ou avec dev-client
npx expo start --dev-client

# Vérification TypeScript
npm run typecheck

# Exécuter les tests unitaires (Vitest)
npm test

# Diagnostic de compatibilité Expo
npm run doctor

# Builds Android avec EAS
npm run build:dev:android      # Development client APK
npm run build:preview:android  # Internal testing APK
npm run build:prod:android     # Production AAB
```

---

## 🌐 Configuration Réseau & Variables d'Environnement

Par défaut, l'application se connecte sur `http://localhost:3001/api/v1` (ou `http://10.0.2.2:3001/api/v1` sur émulateur Android).

Pour tester sur un téléphone physique sur le même réseau Wi-Fi :
Définissez `EXPO_PUBLIC_API_BASE_URL` et `EXPO_PUBLIC_WS_URL` :
```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3001/api/v1
EXPO_PUBLIC_WS_URL=http://192.168.1.50:3001
```
