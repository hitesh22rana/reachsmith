# One image, three jobs: `web` (Next.js standalone), `worker` (BullMQ email
# suggestion worker), and `builder` reused as a one-shot migrator. Pick with
# `docker build --target <web|worker>` or via compose profiles.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build-only dummies so module evaluation passes without real secrets.
# Runtime values come from compose env_file; nothing here is baked in.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
# The runtime role. Separate from the owner above because an owner or
# superuser bypasses row-level security, which would make tenant RLS inert.
ENV APP_DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV REDIS_URL=redis://localhost:6379
ENV BETTER_AUTH_SECRET=build-only-dummy-secret
ENV BETTER_AUTH_URL=http://localhost:3000
RUN pnpm build

FROM node:22-bookworm-slim AS runner-web
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

FROM node:22-bookworm-slim AS runner-worker
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod
COPY --chown=nextjs:nodejs workers ./workers
COPY --chown=nextjs:nodejs lib ./lib
COPY --chown=nextjs:nodejs db ./db
COPY --chown=nextjs:nodejs features/email/emailable.ts ./features/email/emailable.ts
USER nextjs
CMD ["node", "--experimental-strip-types", "--no-warnings", "workers/run.ts"]
