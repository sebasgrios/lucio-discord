import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import { PermissionFlagsBits, type Client, type GuildMember } from 'discord.js';
import Fastify, { LogController, type FastifyRequest } from 'fastify';
import type WebSocket from 'ws';
import type { RawData } from 'ws';
import { z } from 'zod';
import { LIMITS, type PlayerAction, type SessionSnapshot } from '../../shared/index.js';
import { DiscordAudioPipeline } from '../audio/discord-audio-pipeline.js';
import { resolveWhileConnecting } from '../audio/resolve-while-connecting.js';
import type { AppConfig } from '../config.js';
import { LucioError } from '../domain/errors.js';
import { messages } from '../i18n.js';
import type { Logger } from '../logger.js';
import type { SettingsRepository } from '../persistence/settings-repository.js';
import type { DiscordPanelPresenter } from '../discord/presenter.js';
import type { FixedWindowRateLimiter } from '../services/rate-limiter.js';
import type { ResolutionSemaphore } from '../services/resolution-semaphore.js';
import type { SessionManager } from '../services/session-manager.js';
import type { SpotifyOAuthService } from '../services/spotify-oauth-service.js';
import type { NodeProcessRunner } from '../sources/process-runner.js';
import type { SourceRouter } from '../sources/source-router.js';
import type { YtDlpSource } from '../sources/ytdlp-source.js';
import { AuthStore, type WebSession } from './auth-store.js';
import type { MusicSession } from '../domain/session.js';

interface WebDependencies {
  config: AppConfig;
  logger: Logger;
  client: Client;
  settings: SettingsRepository;
  sessions: SessionManager;
  sources: SourceRouter;
  youtube: YtDlpSource;
  runner: NodeProcessRunner;
  limiter: FixedWindowRateLimiter;
  semaphore: ResolutionSemaphore;
  presenter: DiscordPanelPresenter;
  spotifyOAuth?: SpotifyOAuthService;
}

const settingsPatchSchema = z.object({
  locale: z.enum(['es', 'en']).optional(),
  commandChannelId: z.string().nullable().optional(),
  djRoleId: z.string().nullable().optional(),
});

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('skip') }),
  z.object({ type: z.literal('stop') }),
  z.object({ type: z.literal('shuffle') }),
  z.object({ type: z.literal('clear') }),
  z.object({ type: z.literal('autoplay'), enabled: z.boolean() }),
  z.object({ type: z.literal('loop'), mode: z.enum(['off', 'track', 'queue']) }),
  z.object({ type: z.literal('remove'), position: z.number().int().positive() }),
  z.object({
    type: z.literal('move'),
    from: z.number().int().positive(),
    to: z.number().int().positive(),
  }),
]);

const playSchema = z.object({ input: z.string().trim().min(1).max(500) });
const inviteQuerySchema = z.object({ guild_id: z.string().regex(/^\d+$/).optional() });
const botPermissions =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.EmbedLinks |
  PermissionFlagsBits.ReadMessageHistory |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak |
  PermissionFlagsBits.UseApplicationCommands;

interface DiscordGuildPayload {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  owner?: boolean;
}

export async function buildWebServer(dependencies: WebDependencies) {
  const app = Fastify({
    loggerInstance: dependencies.logger,
    logController: new LogController({ disableRequestLogging: true }),
  });
  const auth = new AuthStore();
  const subscribers = new Map<WebSocket, { guildId: string }>();
  const publicOrigin = new URL(dependencies.config.PUBLIC_BASE_URL).origin;

  await app.register(cookie, { secret: dependencies.config.SESSION_SECRET });
  await app.register(websocket);

  app.addHook('onRequest', (request, _reply, done) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.origin;
      if (origin && origin !== publicOrigin) {
        done(new LucioError('NOT_AUTHORIZED', 'Origen no autorizado.', 403));
        return;
      }
    }
    done();
  });

  app.setErrorHandler((error, _request, reply) => {
    const lucioError =
      error instanceof LucioError ? error : new LucioError('INTERNAL_ERROR', 'Error interno.', 500);
    if (!(error instanceof LucioError))
      dependencies.logger.error({ err: error, errorCode: lucioError.code }, 'http request failed');
    void reply
      .status(lucioError.statusCode)
      .send({ error: lucioError.code, message: lucioError.message });
  });

  app.get('/health/live', () => ({ status: 'ok' }));
  app.get('/health/ready', (_request, reply) => {
    const database = dependencies.settings.ping();
    const discord =
      dependencies.config.SKIP_DISCORD_LOGIN === 'true' || dependencies.client.isReady();
    return reply
      .status(database && discord ? 200 : 503)
      .send({ status: database && discord ? 'ready' : 'not-ready', database, discord });
  });
  app.get('/api/status', () => ({
    activeSessions: dependencies.sessions.snapshots().length,
    maximumSessions: LIMITS.maxSessions,
  }));

  app.get('/invite', (request, reply) => {
    if (!dependencies.config.DISCORD_CLIENT_ID) {
      throw new LucioError('INTERNAL_ERROR', 'La invitación no está configurada.', 503);
    }
    const query = inviteQuerySchema.parse(request.query);
    const parameters = new URLSearchParams({
      client_id: dependencies.config.DISCORD_CLIENT_ID,
      scope: 'bot applications.commands',
      permissions: botPermissions.toString(),
    });
    if (query.guild_id) {
      parameters.set('guild_id', query.guild_id);
      parameters.set('disable_guild_select', 'true');
    }
    return reply.redirect(`https://discord.com/oauth2/authorize?${parameters.toString()}`);
  });

  app.get('/auth/discord', (_request, reply) => {
    requireOAuthConfig(dependencies.config);
    const state = crypto.randomUUID();
    reply.setCookie('lucio_oauth_state', state, cookieOptions(dependencies.config, 600));
    const parameters = new URLSearchParams({
      client_id: dependencies.config.DISCORD_CLIENT_ID!,
      redirect_uri: `${dependencies.config.PUBLIC_BASE_URL}/auth/discord/callback`,
      response_type: 'code',
      scope: 'identify guilds',
      state,
    });
    return reply.redirect(`https://discord.com/oauth2/authorize?${parameters.toString()}`);
  });

  app.get('/auth/discord/callback', async (request, reply) => {
    requireOAuthConfig(dependencies.config);
    const query = z.object({ code: z.string(), state: z.string() }).parse(request.query);
    const stateCookie = unsignCookie(request, 'lucio_oauth_state');
    if (!stateCookie || stateCookie !== query.state)
      throw new LucioError('NOT_AUTHORIZED', 'Estado OAuth inválido.', 403);
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: dependencies.config.DISCORD_CLIENT_ID!,
        client_secret: dependencies.config.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: query.code,
        redirect_uri: `${dependencies.config.PUBLIC_BASE_URL}/auth/discord/callback`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok)
      throw new LucioError('NOT_AUTHORIZED', 'Discord rechazó el inicio de sesión.', 401);
    const token = (await tokenResponse.json()) as { access_token: string };
    const headers = { Authorization: `Bearer ${token.access_token}` };
    const [userResponse, guildsResponse] = await Promise.all([
      fetch('https://discord.com/api/v10/users/@me', {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
    ]);
    if (!userResponse.ok || !guildsResponse.ok)
      throw new LucioError('NOT_AUTHORIZED', 'No se pudo leer la cuenta de Discord.', 401);
    const user = (await userResponse.json()) as {
      id: string;
      global_name: string | null;
      username: string;
      avatar: string | null;
    };
    const guilds = (await guildsResponse.json()) as DiscordGuildPayload[];
    const sessionId = auth.create({
      userId: user.id,
      displayName: user.global_name ?? user.username,
      avatar: user.avatar,
      guilds: guilds.filter(canManageGuild).map((guild) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        permissions: guild.permissions,
        botInstalled: dependencies.client.guilds.cache.has(guild.id),
      })),
      expiresAt: Date.now() + 8 * 60 * 60 * 1_000,
    });
    reply.clearCookie('lucio_oauth_state', { path: '/' });
    reply.setCookie('lucio_session', sessionId, cookieOptions(dependencies.config, 8 * 60 * 60));
    return reply.redirect('/dashboard');
  });

  app.get('/auth/spotify/callback', async (request, reply) => {
    if (!dependencies.spotifyOAuth) {
      throw new LucioError('SOURCE_UNAVAILABLE', 'Spotify no está configurado.', 503);
    }
    const query = z
      .object({ code: z.string().min(1), state: z.string().min(1) })
      .safeParse(request.query);
    if (!query.success) {
      throw new LucioError(
        'NOT_AUTHORIZED',
        'Spotify no completó la autorización. Ejecuta `/setup` de nuevo.',
        401,
      );
    }
    const completed = await dependencies.spotifyOAuth.completeAuthorization(
      query.data.code,
      query.data.state,
    );
    await sendSpotifyLinkedNotice(dependencies, completed.guildId, completed.notificationChannelId);
    return reply.type('text/html; charset=utf-8').send(spotifySuccessPage());
  });

  app.post('/auth/logout', (request, reply) => {
    auth.delete(unsignCookie(request, 'lucio_session') ?? undefined);
    reply.clearCookie('lucio_session', { path: '/' });
    return { ok: true };
  });

  app.get('/api/me', (request) => {
    const session = requireWebSession(request, auth);
    return {
      userId: session.userId,
      displayName: session.displayName,
      avatar: session.avatar,
      guilds: session.guilds.map((guild) => ({
        ...guild,
        botInstalled: dependencies.client.guilds.cache.has(guild.id),
      })),
      onboardingCompleted: dependencies.settings.hasCompletedOnboarding(session.userId),
    };
  });

  app.post('/api/me/onboarding', (request) => {
    const session = requireWebSession(request, auth);
    dependencies.settings.completeOnboarding(session.userId);
    return { completed: true };
  });

  app.get('/api/guilds/:guildId/settings', (request) => {
    const { guildId } = parseGuildParams(request.params);
    requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    return dependencies.settings.get(guildId);
  });

  app.put('/api/guilds/:guildId/settings', (request) => {
    const { guildId } = parseGuildParams(request.params);
    const session = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    requireManageGuild(session, guildId);
    const parsed = settingsPatchSchema.parse(request.body);
    const patch = {
      ...(parsed.locale !== undefined ? { locale: parsed.locale } : {}),
      ...(parsed.commandChannelId !== undefined
        ? { commandChannelId: parsed.commandChannelId }
        : {}),
      ...(parsed.djRoleId !== undefined ? { djRoleId: parsed.djRoleId } : {}),
    };
    return dependencies.settings.update(guildId, patch);
  });

  app.get('/api/guilds/:guildId/spotify', (request) => {
    const { guildId } = parseGuildParams(request.params);
    const session = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    requireManageGuild(session, guildId);
    if (!dependencies.spotifyOAuth) {
      return { available: false, connected: false, connectedAt: null, authorizationUrl: null };
    }
    const status = dependencies.spotifyOAuth.status(guildId);
    return {
      available: true,
      ...status,
      authorizationUrl: dependencies.spotifyOAuth.createAuthorizationUrl(
        guildId,
        dependencies.settings.get(guildId).commandChannelId,
      ),
    };
  });

  app.delete('/api/guilds/:guildId/spotify', (request) => {
    const { guildId } = parseGuildParams(request.params);
    const session = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    requireManageGuild(session, guildId);
    dependencies.spotifyOAuth?.disconnect(guildId);
    return { connected: false };
  });

  app.get('/api/guilds/:guildId/options', async (request) => {
    const { guildId } = parseGuildParams(request.params);
    const session = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    requireManageGuild(session, guildId);
    const guild = await dependencies.client.guilds.fetch(guildId);
    return {
      channels: guild.channels.cache
        .filter((channel) => channel.isTextBased() && !channel.isDMBased())
        .map((channel) => ({ id: channel.id, name: channel.name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      roles: guild.roles.cache
        .filter((role) => !role.managed && role.id !== guild.id)
        .map((role) => ({ id: role.id, name: role.name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    };
  });

  app.get('/api/guilds/:guildId/player', (request) => {
    const { guildId } = parseGuildParams(request.params);
    requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    return { snapshot: dependencies.sessions.get(guildId)?.snapshot() ?? null };
  });

  app.post('/api/guilds/:guildId/player/play', async (request) => {
    const playStartedAt = performance.now();
    const { guildId } = parseGuildParams(request.params);
    const webSession = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    dependencies.limiter.consume(
      `play:${guildId}:${webSession.userId}`,
      LIMITS.playRequestsPerMinute,
      60_000,
    );
    const member = await requireVoiceMember(dependencies.client, guildId, webSession.userId);
    const voiceChannel = member.voice.channel!;
    let musicSession = dependencies.sessions.get(guildId);
    if (musicSession && musicSession.voiceChannelId !== voiceChannel.id)
      throw new LucioError('WRONG_VOICE_CHANNEL', 'Lucio está en otro canal.', 409);
    if (!musicSession && dependencies.sessions.snapshots().length >= LIMITS.maxSessions)
      throw new LucioError('CAPACITY_REACHED', 'Lucio está atendiendo otra sesión.', 503);
    const resolutionQueuedAt = performance.now();
    const resolution = dependencies.semaphore.run(async () => {
      const resolutionStartedAt = performance.now();
      const result = await dependencies.sources.resolveProgressively({
        guildId,
        input: playSchema.parse(request.body).input,
        requestedBy: webSession.userId,
        limit: LIMITS.maxPlaylistItems,
      });
      dependencies.logger.info(
        {
          durationMs: Math.round(performance.now() - resolutionStartedAt),
          queueWaitMs: Math.round(resolutionStartedAt - resolutionQueuedAt),
          trackCount: result.initial.length,
          pendingTrackCount: Math.max(0, result.expectedCount - result.initial.length),
          source: result.initial[0]?.source,
        },
        'source resolution ready',
      );
      return result;
    });
    if (!musicSession) {
      const textChannelId = selectTextChannelId(
        member,
        dependencies.settings.get(guildId).commandChannelId,
      );
      const result = await resolveWhileConnecting(
        resolution,
        DiscordAudioPipeline.connect(
          voiceChannel,
          dependencies.config,
          dependencies.runner,
          dependencies.logger,
          dependencies.youtube.playbackTickets,
        ),
      );
      const concurrentSession = dependencies.sessions.get(guildId);
      let createdSession = false;
      if (concurrentSession) {
        result.connection.destroy();
        musicSession = concurrentSession;
      } else {
        try {
          musicSession = dependencies.sessions.create({
            guildId,
            voiceChannelId: voiceChannel.id,
            textChannelId,
            pipeline: result.connection,
            autoplaySource: dependencies.youtube,
            logger: dependencies.logger,
            getListenerCount: () => voiceChannel.members.filter((item) => !item.user.bot).size,
          });
          createdSession = true;
        } catch (error) {
          result.connection.destroy();
          throw error;
        }
      }
      if (musicSession.voiceChannelId !== voiceChannel.id)
        throw new LucioError('WRONG_VOICE_CHANNEL', 'Lucio está en otro canal.', 409);
      await musicSession.add(result.resolved.initial);
      if (createdSession) dependencies.presenter.attach(musicSession);
      if (result.resolved.remaining) musicSession.addDeferred(result.resolved.remaining());
      dependencies.logger.info(
        {
          durationMs: Math.round(performance.now() - playStartedAt),
          trackCount: result.resolved.initial.length,
          newSession: true,
          playbackStarted: true,
        },
        'play request ready',
      );
      return {
        added: result.resolved.initial.length,
        resolving: Math.max(0, result.resolved.expectedCount - result.resolved.initial.length),
        snapshot: musicSession.snapshot(),
      };
    }
    const startsPlayback = musicSession.current === null;
    const resolved = await resolution;
    await musicSession.add(resolved.initial);
    if (resolved.remaining) musicSession.addDeferred(resolved.remaining());
    dependencies.logger.info(
      {
        durationMs: Math.round(performance.now() - playStartedAt),
        trackCount: resolved.initial.length,
        newSession: false,
        playbackStarted: startsPlayback,
      },
      'play request ready',
    );
    return {
      added: resolved.initial.length,
      resolving: Math.max(0, resolved.expectedCount - resolved.initial.length),
      snapshot: musicSession.snapshot(),
    };
  });

  app.post('/api/guilds/:guildId/player/action', async (request) => {
    const { guildId } = parseGuildParams(request.params);
    const webSession = requireInstalledGuildAccess(request, auth, dependencies.client, guildId);
    const member = await requireVoiceMember(dependencies.client, guildId, webSession.userId);
    const musicSession = dependencies.sessions.get(guildId);
    if (!musicSession) throw new LucioError('EMPTY_QUEUE', 'No hay una sesión activa.', 404);
    if (member.voice.channelId !== musicSession.voiceChannelId)
      throw new LucioError('WRONG_VOICE_CHANNEL', 'Debes estar en el canal de Lucio.', 403);
    dependencies.limiter.consume(
      `control:${guildId}:${webSession.userId}`,
      LIMITS.controlsPerMinute,
      60_000,
    );
    const action = actionSchema.parse(request.body);
    await applyAction(action, musicSession, member, dependencies.settings.get(guildId).djRoleId);
    return { snapshot: dependencies.sessions.get(guildId)?.snapshot() ?? null };
  });

  app.get('/ws', { websocket: true }, (socket, request) => {
    const webSession = getWebSession(request, auth);
    if (!webSession) return socket.close(1008, 'Unauthorized');
    socket.on('message', (raw) => {
      try {
        const message = z
          .object({ type: z.literal('subscribe'), guildId: z.string() })
          .parse(JSON.parse(rawMessageToString(raw)));
        if (!webSession.guilds.some((guild) => guild.id === message.guildId))
          return socket.close(1008, 'Forbidden');
        if (!dependencies.client.guilds.cache.has(message.guildId))
          return socket.close(1008, 'Bot not installed');
        subscribers.set(socket, { guildId: message.guildId });
        socket.send(
          JSON.stringify({
            type: 'snapshot',
            data: dependencies.sessions.get(message.guildId)?.snapshot() ?? null,
          }),
        );
      } catch {
        socket.close(1003, 'Invalid message');
      }
    });
    socket.once('close', () => subscribers.delete(socket));
  });

  dependencies.sessions.on('change', (guildId: string, snapshot: SessionSnapshot | null) => {
    const payload = JSON.stringify({ type: 'snapshot', data: snapshot });
    for (const [socket, subscription] of subscribers) {
      if (subscription.guildId === guildId && socket.readyState === 1) socket.send(payload);
    }
  });

  const webRoot = resolve(process.cwd(), 'dist/web');
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith('/api/') ||
        request.url.startsWith('/auth/') ||
        request.url === '/ws'
      )
        return reply.status(404).send({ error: 'NOT_FOUND' });
      return reply.sendFile('index.html');
    });
  }

  return app;
}

function spotifySuccessPage(): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Spotify vinculado · Lucio</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0d140a; color: #edf7e6; font: 16px system-ui, sans-serif; }
      main { width: min(480px, calc(100% - 48px)); padding: 36px; border: 1px solid #486828; border-radius: 20px; background: #111b0d; text-align: center; }
      h1 { margin-top: 0; } p { color: #b8c9ad; line-height: 1.6; }
    </style>
  </head>
  <body><main><h1>Spotify vinculado</h1><p>La configuración se ha guardado de forma segura. Ya puedes cerrar esta ventana y volver a Discord.</p></main></body>
</html>`;
}

async function sendSpotifyLinkedNotice(
  dependencies: Pick<WebDependencies, 'client' | 'logger' | 'settings'>,
  guildId: string,
  notificationChannelId: string | null,
): Promise<void> {
  try {
    const guild = await dependencies.client.guilds.fetch(guildId);
    const settings = dependencies.settings.get(guildId);
    const requested = notificationChannelId
      ? await guild.channels.fetch(notificationChannelId).catch(() => null)
      : null;
    const configured = settings.commandChannelId
      ? await guild.channels.fetch(settings.commandChannelId).catch(() => null)
      : null;
    const candidates = [
      requested,
      configured,
      guild.systemChannel,
      ...guild.channels.cache.values(),
    ];
    const channel = candidates.find((candidate) => candidate?.isSendable());
    if (!channel?.isSendable()) return;
    await channel.send(messages(settings.locale).spotifyLinked);
  } catch (error) {
    dependencies.logger.warn({ err: error, guildId }, 'spotify connection notice failed');
  }
}

function cookieOptions(config: AppConfig, maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    signed: true,
    maxAge,
  };
}

function unsignCookie(request: FastifyRequest, name: string): string | null {
  const raw = request.cookies[name];
  if (!raw) return null;
  const result = request.unsignCookie(raw);
  return result.valid ? result.value : null;
}

function getWebSession(request: FastifyRequest, store: AuthStore): WebSession | null {
  return store.get(unsignCookie(request, 'lucio_session') ?? undefined);
}

function requireWebSession(request: FastifyRequest, store: AuthStore): WebSession {
  const session = getWebSession(request, store);
  if (!session) throw new LucioError('NOT_AUTHORIZED', 'Inicia sesión con Discord.', 401);
  return session;
}

function requireGuildAccess(
  request: FastifyRequest,
  store: AuthStore,
  guildId: string,
): WebSession {
  const session = requireWebSession(request, store);
  if (!session.guilds.some((guild) => guild.id === guildId))
    throw new LucioError('NOT_AUTHORIZED', 'No perteneces a ese servidor.', 403);
  return session;
}

function requireInstalledGuildAccess(
  request: FastifyRequest,
  store: AuthStore,
  client: Client,
  guildId: string,
): WebSession {
  const session = requireGuildAccess(request, store, guildId);
  if (!client.guilds.cache.has(guildId)) {
    throw new LucioError(
      'NOT_AUTHORIZED',
      'Añade Lucio a este servidor antes de abrir su dashboard.',
      403,
    );
  }
  return session;
}

function canManageGuild(guild: DiscordGuildPayload): boolean {
  const permissions = BigInt(guild.permissions);
  return (
    guild.owner === true ||
    (permissions & PermissionFlagsBits.Administrator) !== 0n ||
    (permissions & PermissionFlagsBits.ManageGuild) !== 0n
  );
}

function requireManageGuild(session: WebSession, guildId: string): void {
  const guild = session.guilds.find((item) => item.id === guildId);
  if (
    !guild ||
    ((BigInt(guild.permissions) & PermissionFlagsBits.ManageGuild) === 0n &&
      (BigInt(guild.permissions) & PermissionFlagsBits.Administrator) === 0n)
  )
    throw new LucioError('NOT_AUTHORIZED', 'Necesitas Gestionar servidor.', 403);
}

async function requireVoiceMember(
  client: Client,
  guildId: string,
  userId: string,
): Promise<GuildMember> {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);
  if (!member.voice.channel)
    throw new LucioError('NOT_IN_VOICE', 'Debes estar en un canal de voz.', 403);
  return member;
}

function selectTextChannelId(member: GuildMember, configuredChannelId: string | null): string {
  const configured = configuredChannelId
    ? member.guild.channels.cache.get(configuredChannelId)
    : null;
  const settingsChannel = member.guild.systemChannel;
  const fallback = member.guild.channels.cache.find(
    (channel) => channel.isTextBased() && !channel.isDMBased(),
  );
  const channel = configured?.isTextBased() ? configured : (settingsChannel ?? fallback);
  if (!channel)
    throw new LucioError('NOT_AUTHORIZED', 'Lucio necesita un canal de texto visible.', 403);
  return channel.id;
}

function parseGuildParams(params: unknown): { guildId: string } {
  return z.object({ guildId: z.string() }).parse(params);
}

async function applyAction(
  action: PlayerAction,
  musicSession: MusicSession,
  member: GuildMember,
  djRoleId: string | null,
): Promise<void> {
  switch (action.type) {
    case 'pause':
      musicSession.pause();
      break;
    case 'resume':
      musicSession.resume();
      break;
    case 'skip':
      await musicSession.voteSkip(
        member.id,
        musicSession.current?.requestedBy === member.id ||
          member.permissions.has(PermissionFlagsBits.Administrator) ||
          (djRoleId !== null && member.roles.cache.has(djRoleId)),
      );
      break;
    case 'stop':
      musicSession.stop();
      break;
    case 'shuffle':
      musicSession.shuffle();
      break;
    case 'clear':
      musicSession.clear();
      break;
    case 'autoplay':
      musicSession.setAutoplay(action.enabled);
      break;
    case 'loop':
      musicSession.setLoop(action.mode);
      break;
    case 'remove':
      musicSession.remove(action.position);
      break;
    case 'move':
      musicSession.move(action.from, action.to);
      break;
  }
}

function requireOAuthConfig(config: AppConfig): void {
  if (!config.DISCORD_CLIENT_ID || !config.DISCORD_CLIENT_SECRET)
    throw new LucioError('INTERNAL_ERROR', 'OAuth no está configurado.', 503);
}

function rawMessageToString(raw: RawData): string {
  if (Array.isArray(raw)) return Buffer.concat(raw).toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  return raw.toString('utf8');
}
