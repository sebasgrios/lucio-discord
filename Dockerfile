FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json web/tsconfig.json vite.config.ts vitest.config.ts eslint.config.js ./
COPY src ./src
COPY web ./web
RUN pnpm build
RUN pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ARG YTDLP_VERSION=2026.08.19
ARG YTDLP_SHA256=58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg \
  && curl --fail --location "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux" --output /usr/local/bin/yt-dlp \
  && echo "${YTDLP_SHA256}  /usr/local/bin/yt-dlp" | sha256sum --check --strict \
  && chmod 0755 /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/lucio.db
ENV YTDLP_CACHE_DIR=/data/yt-dlp-cache
ENV NODE_OPTIONS=--max-old-space-size=256
RUN corepack enable && mkdir -p /data && chown node:node /data
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/server/index.js"]
