# syntax=docker/dockerfile:1

# ── Stage 1: Build & Compile Native Addons ───────────────────────────────────
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build toolchain required for building sqlite3 from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json package-lock.json ./

# Compile sqlite3 from source to guarantee binary compatibility with Debian glibc
RUN npm ci --omit=dev --build-from-source=sqlite3

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /app

# Copy compiled production node_modules from builder stage
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

# Expose server port
EXPOSE 3000

# Container healthcheck using the native /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Entrypoint manages database seeding and runtime config compilation
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start Express server
CMD ["node", "logic.js"]
