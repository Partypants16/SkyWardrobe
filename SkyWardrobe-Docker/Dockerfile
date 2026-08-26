# syntax=docker/dockerfile:1

# ── Stage 1: Build Native Addons ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build toolchain required to compile sqlite3 from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json package-lock.json ./

# Install dependencies WITHOUT running any pre-install/install scripts
# (this prevents npm from downloading the pre-built platform-specific binary).
# Then rebuild sqlite3 from source against the container's own glibc.
RUN npm ci --omit=dev --ignore-scripts \
    && npm rebuild sqlite3 --build-from-source

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy the source-compiled node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy application source files
COPY logic.js db.js ./
COPY scripts/ ./scripts/
COPY www/ ./www/
COPY docker-entrypoint.sh ./

# Create data directory, set executable permissions, and transfer ownership to node user
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
