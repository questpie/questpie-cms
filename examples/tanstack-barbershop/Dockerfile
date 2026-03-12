# syntax=docker/dockerfile:1.6

# =============================================================================
# QUESTPIE + TanStack Start — Production Dockerfile
#
# Build targets:
#   web    — TanStack Start SSR app (serves UI + API)
#   worker — Background job processor (pg-boss queue listener)
#
# Migrations run automatically on startup (autoMigrate: true in app config).
# Required seeds (e.g. site settings) also run on startup (autoSeed: "required").
# Demo seeds can be run manually: docker exec <container> bun questpie seed --category dev
#
# Usage:
#   docker build --target web -t barbershop-web .
#   docker build --target worker -t barbershop-worker .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Install ALL dependencies (needed for build)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.0-alpine AS deps
WORKDIR /app
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 2: Build the TanStack Start app (outputs to .output/)
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 3: Install production-only dependencies
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.0-alpine AS prod-deps
WORKDIR /app
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile --production

# ---------------------------------------------------------------------------
# Stage 4: Web server (TanStack Start SSR + QUESTPIE API)
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.0-alpine AS web
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Production dependencies
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json bun.lock ./

# Built application output (TanStack Start with Bun preset)
COPY --from=build --chown=app:app /app/.output ./.output

# Source files needed at runtime:
# - QUESTPIE server config (collections, globals, fields, hooks, RPC, seeds, migrations)
# - These are imported by the built .output server bundle at runtime
COPY --chown=app:app src ./src
COPY --chown=app:app tsconfig.json ./

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=5 \
  CMD bun -e "fetch('http://127.0.0.1:'+process.env.PORT).then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

USER app
EXPOSE 3000

# The .output/server/index.mjs is the built TanStack Start server entry point.
# Migrations and required seeds run automatically via autoMigrate/autoSeed in app config.
CMD ["bun", ".output/server/index.mjs"]

# ---------------------------------------------------------------------------
# Stage 5: Background job worker
# ---------------------------------------------------------------------------
FROM oven/bun:1.3.0-alpine AS worker
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Production dependencies
COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app package.json bun.lock ./

# Worker source + QUESTPIE server config
COPY --chown=app:app src ./src
COPY --chown=app:app tsconfig.json ./

USER app

CMD ["bun", "src/worker.ts"]
