# --- Stage 1 : build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* doivent être présentes au moment du build : Next.js les inline dans le bundle JS
# envoyé au navigateur (elles ne sont plus lues au runtime pour le code client). Valeurs par
# défaut ci-dessous pour permettre un build sans .env (ex: CI) ; docker-compose peut les
# surcharger via des build args si des valeurs différentes sont nécessaires en prod.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_API_WS_URL=http://localhost:3001
ARG NEXT_PUBLIC_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_WS_URL=$NEXT_PUBLIC_API_WS_URL
ENV NEXT_PUBLIC_MAP_STYLE_URL=$NEXT_PUBLIC_MAP_STYLE_URL
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
