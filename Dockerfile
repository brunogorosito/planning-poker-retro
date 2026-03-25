FROM node:20-alpine

# Herramientas para compilar better-sqlite3 (módulo nativo)
RUN apk add --no-cache python3 make g++

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copiar manifests primero para aprovechar cache de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Build: cliente → servidor → copia estáticos
RUN pnpm build

# Directorio para SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/scrum-poker.db
ENV CORS_ORIGIN=*

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
