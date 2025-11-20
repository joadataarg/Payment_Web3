ARG BUN_VERSION=1.1.32
ARG STARKLI_VERSION=0.1.24
ARG STARKLI_TARGET=x86_64-unknown-linux-gnu

FROM oven/bun:${BUN_VERSION}-debian AS base

ARG STARKLI_VERSION
ARG STARKLI_TARGET

# Dependencias de sistema necesarias para Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl libssl-dev ca-certificates curl xz-utils && \
    rm -rf /var/lib/apt/lists/*

# Instalar starkli CLI para ejecutar transacciones en Starknet
RUN curl https://get.starkli.sh | sh
RUN starkliup

ENV STARKLI_PATH=~/.starkli/bin/starkli

RUN ln -s ~/.starkli/bin/starkli /usr/local/bin/starkli

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
