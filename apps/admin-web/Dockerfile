# syntax=docker/dockerfile:1.7
# --- Stage 1 : build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Le cache BuildKit évite de retélécharger tous les paquets lorsqu'un build est relancé.
# Les délais et tentatives supplémentaires absorbent les coupures réseau temporaires du
# registre npm (ECONNRESET), fréquentes sur une connexion lente ou instable.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=120000 \
      --fetch-timeout=600000
COPY . .
# NEXT_PUBLIC_* doivent être présentes au moment du build : Next.js les inline dans le bundle JS
# envoyé au navigateur (elles ne sont plus lues au runtime pour le code client). Valeurs par
# défaut ci-dessous pour permettre un build sans .env (ex: CI) ; docker-compose peut les
# surcharger via des build args si des valeurs différentes sont nécessaires en prod.
# Dans l'image Docker, le navigateur passe par nginx sur la même origine. Des URLs relatives
# fonctionnent donc avec localhost, l'adresse LAN du PC et, plus tard, le domaine de production.
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_API_WS_URL=
ARG NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
ARG NEXT_PUBLIC_TOMTOM_API_KEY=
ARG NEXT_PUBLIC_TOMTOM_STYLE_VERSION=24.*
ARG NEXT_PUBLIC_MAP_TERRAIN_URL=https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_WS_URL=$NEXT_PUBLIC_API_WS_URL
ENV NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL
ENV NEXT_PUBLIC_TOMTOM_API_KEY=$NEXT_PUBLIC_TOMTOM_API_KEY
ENV NEXT_PUBLIC_TOMTOM_STYLE_VERSION=$NEXT_PUBLIC_TOMTOM_STYLE_VERSION
ENV NEXT_PUBLIC_MAP_TERRAIN_URL=$NEXT_PUBLIC_MAP_TERRAIN_URL
RUN npm run build

# --- Stage 2 : runtime (image slim, sortie "standalone" de Next.js) ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# .next/standalone contient un server.js autonome + uniquement les node_modules tracés
# (beaucoup plus léger que de copier node_modules entier depuis le builder).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
