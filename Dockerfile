# ---------- Etapa 1: dependencias de producción ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---------- Etapa 2: imagen final (pequeña y sin herramientas de desarrollo) ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY migrations ./migrations
COPY seeders ./seeders

# Seguridad: no ejecutar como root
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT:-3001}/health" || exit 1

CMD ["node", "src/server.js"]
