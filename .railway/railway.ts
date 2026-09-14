import { defineRailway, preserve, project, service, volume } from 'railway/iac';

export default defineRailway(() => {
  const lucioDiscordVolume = volume('lucio-discord-volume', {
    alerts: { usage: { '100': {}, '80': {}, '95': {} } },
    allowOnlineResize: true,
    region: 'sfo',
    sizeMB: 500,
  });
  const lucioDiscord = service('lucio-discord', {
    replicas: { sfo: 1 },
    volumeMounts: { '/data': lucioDiscordVolume },
    env: {
      DATABASE_PATH: preserve(),
      DISCORD_CLIENT_ID: preserve(),
      DISCORD_CLIENT_SECRET: preserve(),
      DISCORD_TOKEN: preserve(),
      FFMPEG_PATH: preserve(),
      HOST: preserve(),
      LOG_LEVEL: preserve(),
      NODE_ENV: preserve(),
      PUBLIC_BASE_URL: preserve(),
      RAILWAY_RUN_UID: preserve(),
      SESSION_SECRET: preserve(),
      SKIP_DISCORD_LOGIN: preserve(),
      SPOTIFY_CLIENT_ID: preserve(),
      SPOTIFY_CLIENT_SECRET: preserve(),
      YOUTUBE_COOKIES_BASE64: preserve(),
      YTDLP_CACHE_DIR: preserve(),
      YTDLP_COOKIES_PATH: preserve(),
      YTDLP_PATH: preserve(),
    },
    start: 'node --enable-source-maps dist/server/index.js',
    healthcheck: '/health/live',
    healthcheckTimeout: 30,
    preDeploy: 'node dist/server/register-commands.js',
  });

  return project('lucio-discord', {
    resources: [lucioDiscord, lucioDiscordVolume],
  });
});
