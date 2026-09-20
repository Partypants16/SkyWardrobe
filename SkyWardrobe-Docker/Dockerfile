# syntax=docker/dockerfile:1

# ── Stage 1: Build Native Addons ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Native build toolchain, used as a fallback if better-sqlite3 has no
# prebuilt binary for this platform and must compile from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# package-lock.json is not committed (repo-wide .gitignore), so resolve
# dependencies fresh here. Scripts must run so better-sqlite3's install
# step fetches (or builds) the native binary for this container's own
# glibc, not the host's.
COPY package.json ./
RUN npm install --omit=dev

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy the source-compiled node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Copy application source files
COPY logic.js db.js ./
COPY scripts/ ./scripts/
COPY www/ ./www/
COPY docker-entrypoint.sh ./

# Create data directory, set permissions, and set ownership to node user
RUN mkdir -p /app/data \
    && chmod +x /app/docker-entrypoint.sh \
    && chown -R node:node /app

# Switch to non-root node user for security
USER node

EXPOSE 3000

# Container healthcheck using the native /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "logic.js"]
