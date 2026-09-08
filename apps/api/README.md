# API — NestJS / Prisma / PostgreSQL+PostGIS / Redis

Backend unique et autoritaire de la plateforme. Aucune décision de validation
(mission, collecte, position) ne doit être prise côté client — uniquement ici.

## Stack
- NestJS + TypeScript strict
- Prisma ORM → PostgreSQL + PostGIS
- Redis (OTP, BullMQ, événements temps réel)
- Socket.IO (diffusion des positions et alertes)
- JWT (access court + refresh rotatif) + Argon2
- class-validator / class-transformer
- Swagger/OpenAPI
- Jest (unit + e2e)

## Modules (src/)
| Dossier | Rôle |
|---|---|
| auth | OTP WhatsApp/e-mail, login admin, JWT, refresh, devices |
| drivers | CRUD chauffeurs, affectation véhicule, révocation appareil |
| vehicles | CRUD véhicules, historique, affectation chauffeur |
| locations | Points de collecte/dépôt, géométrie PostGIS, QR codes |
| missions | Planification, affectation, cycle de vie des missions |
| mission-steps | Étapes, validation GPS+QR+photo, preuves |
| tracking | Ingestion positions GPS, trace, dernière position, live |
| fuel | Déclarations carburant, calcul consommation, anomalies |
| alerts | Détection fraude/anomalies, score de suspicion |
| files | Upload S3, hash, URLs signées |
| notifications | Firebase Cloud Messaging |
| users / roles | Comptes admin/super-admin, RBAC, permissions |
| audit | Journal des actions sensibles |
| common | Guards, interceptors, filters, decorators partagés |
| config | Validation des variables d'environnement (Zod/Joi) |
| prisma | PrismaService, PrismaModule |

## Commandes
```bash
npm install
npx prisma migrate dev
npm run start:dev
npm run test
npm run test:e2e
```
