# Multi-stage Dockerfile for dayli.ai WhatsApp Climate Health Copilot
# Based on the production-grade Archive (BO) blueprint

# Stage 1: Build & dependency resolution
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies with exact lockfile for reproducible builds
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy application sources
COPY . .

# Prune devDependencies to keep production image minimal
RUN npm prune --omit=dev

# Stage 2: Minimal runtime image
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# curl for container healthcheck; ffmpeg converts TTS audio to OGG/Opus —
# the only voice-note format WhatsApp plays (it rejects WAV/PCM).
RUN apk add --no-cache curl ffmpeg

# Copy runtime artifacts from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/whatsapp-bridge ./whatsapp-bridge
COPY --from=build /app/shared ./shared

# Create non-root user for security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

CMD ["sh", "-c", "node whatsapp-bridge/server.js"]
