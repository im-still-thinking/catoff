# Base stage with shared configuration
FROM node:18-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies stage - optimized for caching
FROM base AS deps
RUN apk add --no-cache python3 make g++ libc6-compat \
    && ln -sf python3 /usr/bin/python
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Builder stage
FROM base AS builder
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NEXT_PRIVATE_STANDALONE=true npm run build

# Production stage - minimal final image
FROM node:18-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["node", "server.js"]