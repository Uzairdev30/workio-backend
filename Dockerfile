# ─── Build stage ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source & build
COPY . .
RUN npm run build

# ─── Production stage ─────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Own the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/main.js"]
