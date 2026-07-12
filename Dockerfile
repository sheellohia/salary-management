# syntax=docker/dockerfile:1

# ---- Build stage: install deps and build both server (tsup) and web (vite) ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
# Toolchain for compiling better-sqlite3's native binding if no prebuilt exists.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage: minimal image serving API + built SPA on one port ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    WEB_DIST_PATH=/app/web/dist \
    DATABASE_PATH=/app/server/data/salary.db
# node_modules carries the already-compiled native binding + tsx (for the seed).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/web/dist ./web/dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint.sh"]
