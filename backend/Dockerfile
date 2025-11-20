FROM oven/bun:1.1.32-debian AS base

# Dependencias de sistema necesarias para Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl libssl-dev ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM base AS deps
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN bunx prisma generate

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
RUN rm -rf node_modules && bun install --frozen-lockfile --production
RUN chown -R bun:bun /app
USER bun
EXPOSE 3001
CMD ["bun", "run", "start"]
