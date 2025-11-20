ARG BUN_VERSION=1.1.32
FROM oven/bun:${BUN_VERSION}-alpine AS base

RUN apk add --no-cache curl

# Build arguments para variables públicas de Next.js
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

WORKDIR /app

FROM base AS deps
COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app ./
RUN rm -rf node_modules && bun install --frozen-lockfile --production
RUN chown -R bun:bun /app
USER bun
EXPOSE 3000
CMD ["bun", "run", "start"]
