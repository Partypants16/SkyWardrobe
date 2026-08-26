# syntax=docker/dockerfile:1

# ── Stage 1: Build Native Addons ─────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build toolchain required to compile better-sqlite3 from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY package.json (not package-lock.json) so npm generates a fresh
# Linux-native lockfile instead of resolving Windows prebuilt binaries
COPY package.json ./

# Install all production dependencies, compiling better-sqlite3 from source
# against the container's own glibc (Debian Bookworm, glibc 2.36)
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
