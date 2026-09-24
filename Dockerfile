# One image, three jobs: `web` (Next.js standalone), `worker` (BullMQ email
# workers), and `builder` reused as a one-shot migrator. Pick with
# `docker build --target <web|worker>` or via compose profiles.
#
# The rank model is baked in at build time (pinned revision, no runtime
# download); workers read it from /models via HF_MODEL_CACHE.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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
ENV REDIS_URL=redis://localhost:6379
ENV BETTER_AUTH_SECRET=build-only-dummy-secret
ENV BETTER_AUTH_URL=http://localhost:3000
RUN pnpm build

FROM node:22-bookworm-slim AS model
WORKDIR /models
ARG MODEL_SHA=9217f5db79a29953eb74d5343926648285ec7e67
ARG MODEL_FILE=qwen2.5-0.5b-instruct-q4_k_m.gguf
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists && \
    curl -fsSL -o "${MODEL_FILE}" \
      "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/${MODEL_SHA}/${MODEL_FILE}" && \
    chmod 644 "${MODEL_FILE}"

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
ENV HF_MODEL_CACHE=/models
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate && \
    groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod
COPY --chown=nextjs:nodejs workers ./workers
COPY --chown=nextjs:nodejs lib ./lib
COPY --chown=nextjs:nodejs db ./db
COPY --from=model --chown=nextjs:nodejs /models/qwen2.5-0.5b-instruct-q4_k_m.gguf /models/
USER nextjs
CMD ["node", "--experimental-strip-types", "--no-warnings", "workers/run.ts"]
