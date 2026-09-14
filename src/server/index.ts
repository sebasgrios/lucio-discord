import { Client, Events, GatewayIntentBits } from 'discord.js';
import { loadConfig, type AppConfig } from './config.js';
import { DiscordController } from './discord/controller.js';
import { DiscordPanelPresenter } from './discord/presenter.js';
import { createLogger } from './logger.js';
import { SettingsRepository } from './persistence/settings-repository.js';
import { SpotifyConnectionRepository } from './persistence/spotify-connection-repository.js';
import { TokenCipher } from './persistence/token-cipher.js';
import { FixedWindowRateLimiter } from './services/rate-limiter.js';
import { ResolutionSemaphore } from './services/resolution-semaphore.js';
import { SessionManager } from './services/session-manager.js';
import { SpotifyOAuthService } from './services/spotify-oauth-service.js';
import { NodeProcessRunner } from './sources/process-runner.js';
import { SourceRouter } from './sources/source-router.js';
import { SpotifySource } from './sources/spotify-source.js';
import { YtDlpSource } from './sources/ytdlp-source.js';
import { prepareYouTubeCookies } from './sources/youtube-cookies.js';
import { buildWebServer } from './web/server.js';
import { LIMITS } from '../shared/index.js';

const baseConfig = loadConfig();
const youtubeCookies = await prepareYouTubeCookies(baseConfig);
const config: AppConfig = { ...baseConfig, YTDLP_COOKIES_PATH: youtubeCookies.path };
const logger = createLogger(config);
const settings = new SettingsRepository(config.DATABASE_PATH);
const spotifyConnections =
  config.SPOTIFY_CLIENT_ID && config.SPOTIFY_CLIENT_SECRET
    ? new SpotifyConnectionRepository(config.DATABASE_PATH, new TokenCipher(config.SESSION_SECRET))
    : undefined;
const spotifyOAuth =
  config.SPOTIFY_CLIENT_ID && config.SPOTIFY_CLIENT_SECRET && spotifyConnections
    ? new SpotifyOAuthService(
        {
          clientId: config.SPOTIFY_CLIENT_ID,
          clientSecret: config.SPOTIFY_CLIENT_SECRET,
          redirectUri: new URL('/auth/spotify/callback', config.PUBLIC_BASE_URL).toString(),
        },
        spotifyConnections,
      )
    : undefined;
const sessions = new SessionManager();
const runner = new NodeProcessRunner();
const youtube = new YtDlpSource(runner, config.YTDLP_PATH, {
  cookiesPath: config.YTDLP_COOKIES_PATH,
  cacheDir: config.YTDLP_CACHE_DIR,
});
const adapters =
  config.SPOTIFY_CLIENT_ID && config.SPOTIFY_CLIENT_SECRET
    ? [
        new SpotifySource(
          config.SPOTIFY_CLIENT_ID,
          config.SPOTIFY_CLIENT_SECRET,
          youtube,
          spotifyOAuth,
        ),
        youtube,
      ]
    : [youtube];
const sources = new SourceRouter(adapters);
const limiter = new FixedWindowRateLimiter();
const semaphore = new ResolutionSemaphore(LIMITS.maxConcurrentResolutions);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
const presenter = new DiscordPanelPresenter(client, settings, logger);

const controller = new DiscordController({
  client,
  config,
  logger,
  settings,
  sessions,
  sources,
  youtube,
  runner,
  limiter,
  semaphore,
  presenter,
  ...(spotifyOAuth ? { spotifyOAuth } : {}),
});
controller.start();

client.once(Events.ClientReady, (readyClient) => {
  logger.info({ guildCount: readyClient.guilds.cache.size }, 'discord ready');
});
client.on(Events.Error, (error) => logger.error({ err: error }, 'discord client error'));

const app = await buildWebServer({
  config,
  logger,
  client,
  settings,
  sessions,
  sources,
  youtube,
  runner,
  limiter,
  semaphore,
  presenter,
  ...(spotifyOAuth ? { spotifyOAuth } : {}),
});
await app.listen({ host: config.HOST, port: config.PORT });
logger.info({ port: config.PORT }, 'http server ready');

if (config.SKIP_DISCORD_LOGIN !== 'true') {
  if (!config.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN es necesario para iniciar Lucio.');
  await client.login(config.DISCORD_TOKEN);
}

const pruneTimer = setInterval(() => limiter.prune(), 60_000);
pruneTimer.unref();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'shutting down');
  clearInterval(pruneTimer);
  sessions.terminateAll();
  await client.destroy();
  await youtubeCookies.dispose();
  settings.close();
  spotifyConnections?.close();
  await app.close();
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
