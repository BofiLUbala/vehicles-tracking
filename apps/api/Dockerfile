FROM node:20-alpine AS builder
WORKDIR /app
# openssl requis dès la génération du client Prisma : `prisma generate` sonde la version
# libssl/openssl disponible pour choisir le bon binaire moteur de requête (musl). Sans lui, la
# détection échoue silencieusement côté build (avertissement ignoré ici) mais surtout côté
# runtime (voir plus bas) où l'absence totale d'OpenSSL fait planter le client au démarrage.
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Requis au runtime par le moteur Prisma (libquery_engine-linux-musl*.so.node) : sans OpenSSL
# installé dans l'image, Prisma ne peut pas détecter la version libssl et le client plante au
# démarrage avec "PrismaClientInitializationError: ... Error loading shared library libssl".
# Vérifié par exécution réelle du conteneur (voir docs/DEPLOYMENT.md) : ce bug préexistait,
# l'image Docker de l'api n'avait jamais été réellement démarrée avant cette phase (Phases 1-4
# n'utilisaient que `docker compose up -d postgres redis` + `npm run start:dev` en local).
RUN apk add --no-cache openssl
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
# `nest build` (tsc) infère la racine commune de compilation à partir de tous les fichiers
# inclus (src/ ET prisma/, ce dernier contenant prisma/seed.ts) : la sortie est donc
# dist/src/main.js (et non dist/main.js), pas dist/main.js. Vérifié par exécution réelle du
# conteneur (bug préexistant, jamais testé avant cette phase).
CMD ["node", "dist/src/main"]
