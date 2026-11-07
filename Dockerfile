# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN npm run build

# Operational tools are separate from the public web image.
FROM builder AS operations
ENV NODE_ENV=production
RUN mkdir -p /app/.local /data/uploads && chown node:node /app/.local /data/uploads
USER node
CMD ["./node_modules/.bin/tsx", "scripts/check-production.ts"]

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# A named volume initialized here inherits the non-root upload ownership.
RUN mkdir -p /data/uploads /app/.next/cache && chown -R node:node /data/uploads /app/.next
USER node
EXPOSE 3000
CMD ["node", "server.js"]
