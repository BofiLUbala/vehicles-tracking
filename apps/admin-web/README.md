# Admin Web — Next.js (tableau de bord administrateur)

Application web pour administrateurs et super-administrateurs.

## Stack
Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query,
React Hook Form, Zod, Socket.IO Client, MapLibre GL JS, Recharts.

## Structure (src/)
| Dossier | Rôle |
|---|---|
| app | Routes Next.js (App Router) : login, dashboard, carte, missions, chauffeurs, véhicules, points, carburant, alertes, rapports, utilisateurs, paramètres |
| components | Composants UI réutilisables (shadcn/ui + composants métier) |
| features | Logique par domaine (missions, tracking, fuel, alerts...) |
| lib | Client API (fetch/axios), client Socket.IO, utilitaires |
| hooks | Hooks React (useLiveVehicles, useMissions, ...) |
| styles | Styles globaux Tailwind |

## Pages attendues (voir section 19)
Connexion → OTP e-mail → Vue générale → Carte temps réel → Missions →
Détail mission → Chauffeurs → Véhicules → Points géographiques → Carburant →
Alertes → Rapports → Utilisateurs → Paramètres.

## Commandes
```bash
npm install
npm run dev
npm run build && npm start
```
