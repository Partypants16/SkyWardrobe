# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /app

# Copy package manifests first for optimal layer caching
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev

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
