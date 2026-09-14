import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type Interaction,
  type VoiceBasedChannel,
} from 'discord.js';
import { LIMITS, type LoopMode, type SessionSnapshot } from '../../shared/index.js';
import { DiscordAudioPipeline } from '../audio/discord-audio-pipeline.js';
import { resolveWhileConnecting } from '../audio/resolve-while-connecting.js';
import type { AppConfig } from '../config.js';
import { LucioError } from '../domain/errors.js';
import { localizedError, messages } from '../i18n.js';
import type { Logger } from '../logger.js';
import type { SettingsRepository } from '../persistence/settings-repository.js';
import type { FixedWindowRateLimiter } from '../services/rate-limiter.js';
import type { ResolutionSemaphore } from '../services/resolution-semaphore.js';
import type { SessionManager } from '../services/session-manager.js';
import type { SpotifyOAuthService } from '../services/spotify-oauth-service.js';
import type { NodeProcessRunner } from '../sources/process-runner.js';
import type { SourceRouter } from '../sources/source-router.js';
import { parseSpotifyResource } from '../sources/spotify-source.js';
import { isSpotifyUrl, parseSupportedUrl } from '../sources/url-policy.js';
import type { YtDlpSource } from '../sources/ytdlp-source.js';
import type { DiscordPanelPresenter } from './presenter.js';

interface ControllerDependencies {
  client: Client;
  config: AppConfig;
  logger: Logger;
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

export class DiscordController {
  constructor(private readonly dependencies: ControllerDependencies) {}

  start(): void {
    this.dependencies.client.on(
      Events.InteractionCreate,
      (interaction) => void this.handle(interaction),
    );
    this.dependencies.client.on(Events.GuildCreate, (guild) => void this.handleGuildCreate(guild));
  }

  private async handle(interaction: Interaction): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    try {
      if (interaction.isChatInputCommand()) await this.handleCommand(interaction);
      else if (interaction.isButton() && interaction.customId.startsWith('lucio:'))
        await this.handleButton(interaction);
    } catch (error) {
      await this.replyError(interaction, error);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    if (interaction.commandName === 'setup') {
      await this.handleSetup(interaction);
      return;
    }
    if (interaction.commandName === 'settings') {
      await this.handleSettings(interaction);
      return;
    }
    const settings = this.dependencies.settings.get(interaction.guildId);
    const copy = messages(settings.locale);
    if (settings.commandChannelId && settings.commandChannelId !== interaction.channelId) {
      throw new LucioError('NOT_AUTHORIZED', 'Usa el canal configurado para comandos.', 403);
    }
    if (interaction.commandName === 'play') {
      const input = interaction.options.getString('query', true);
      const spotifyPrompt = this.spotifyPrompt(interaction, input, settings.locale);
      if (spotifyPrompt?.playlistBlocked) {
        await interaction.reply({
          content: spotifyPrompt.content,
          components: spotifyPrompt.components,
          ephemeral: true,
        });
        return;
      }
      const playStartedAt = performance.now();
      await interaction.deferReply({ ephemeral: true });
      const channel = this.requireVoice(interaction);
      this.dependencies.limiter.consume(
        `play:${interaction.guildId}:${interaction.user.id}`,
        LIMITS.playRequestsPerMinute,
        60_000,
      );
      let session = this.dependencies.sessions.get(interaction.guildId);
      if (session && session.voiceChannelId !== channel.id)
        throw new LucioError('WRONG_VOICE_CHANNEL', 'Lucio está en otro canal.', 409);
      if (!session && this.dependencies.sessions.snapshots().length >= LIMITS.maxSessions) {
        throw new LucioError('CAPACITY_REACHED', 'Lucio está atendiendo otra sesión.', 503);
      }
      const resolutionQueuedAt = performance.now();
      const resolution = this.dependencies.semaphore.run(async () => {
        const resolutionStartedAt = performance.now();
        const result = await this.dependencies.sources.resolveProgressively({
          guildId: interaction.guildId,
          input,
          requestedBy: interaction.user.id,
          limit: LIMITS.maxPlaylistItems,
        });
        this.dependencies.logger.info(
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
      if (!session) {
        const result = await resolveWhileConnecting(
          resolution,
          DiscordAudioPipeline.connect(
            channel,
            this.dependencies.config,
            this.dependencies.runner,
            this.dependencies.logger,
            this.dependencies.youtube.playbackTickets,
          ),
        );
        const concurrentSession = this.dependencies.sessions.get(interaction.guildId);
        let createdSession = false;
        if (concurrentSession) {
          result.connection.destroy();
          session = concurrentSession;
        } else {
          try {
            session = this.dependencies.sessions.create({
              guildId: interaction.guildId,
              voiceChannelId: channel.id,
              textChannelId: interaction.channelId,
              pipeline: result.connection,
              autoplaySource: this.dependencies.youtube,
              logger: this.dependencies.logger,
              getListenerCount: () => countHumanListeners(channel),
            });
            createdSession = true;
          } catch (error) {
            result.connection.destroy();
            throw error;
          }
        }
        if (session.voiceChannelId !== channel.id) {
          throw new LucioError('WRONG_VOICE_CHANNEL', 'Lucio está en otro canal.', 409);
        }
        await session.add(result.resolved.initial);
        if (createdSession) this.dependencies.presenter.attach(session);
        if (result.resolved.remaining) session.addDeferred(result.resolved.remaining());
        this.dependencies.logger.info(
          {
            durationMs: Math.round(performance.now() - playStartedAt),
            trackCount: result.resolved.initial.length,
            newSession: true,
            playbackStarted: true,
          },
          'play request ready',
        );
        await interaction.editReply({
          content: withSpotifyPrompt(playConfirmation(copy, result.resolved), spotifyPrompt),
          components: spotifyPrompt?.components ?? [],
        });
        return;
      }
      const startsPlayback = session.current === null;
      const resolved = await resolution;
      await session.add(resolved.initial);
      if (resolved.remaining) session.addDeferred(resolved.remaining());
      this.dependencies.logger.info(
        {
          durationMs: Math.round(performance.now() - playStartedAt),
          trackCount: resolved.initial.length,
          newSession: false,
          playbackStarted: startsPlayback,
        },
        'play request ready',
      );
      await interaction.editReply({
        content: withSpotifyPrompt(playConfirmation(copy, resolved), spotifyPrompt),
        components: spotifyPrompt?.components ?? [],
      });
      return;
    }

    const session = this.requireSession(interaction.guildId);
    this.requireSameVoice(interaction, session.voiceChannelId);
    this.dependencies.limiter.consume(
      `control:${interaction.guildId}:${interaction.user.id}`,
      LIMITS.controlsPerMinute,
      60_000,
    );

    switch (interaction.commandName) {
      case 'queue':
        await interaction.reply({
          content: formatQueue(session.snapshot(), settings.locale),
          ephemeral: true,
        });
        break;
      case 'nowplaying':
        await interaction.reply({
          content: session.current
            ? copy.nowPlaying(session.current.title, session.current.artist)
            : copy.nowPlayingEmpty,
          ephemeral: true,
        });
        break;
      case 'pause':
        session.pause();
        await interaction.reply({ content: copy.paused, ephemeral: true });
        break;
      case 'resume':
        session.resume();
        await interaction.reply({ content: copy.resumed, ephemeral: true });
        break;
      case 'skip': {
        const result = await session.voteSkip(
          interaction.user.id,
          this.canSkipImmediately(
            interaction.member,
            session.current?.requestedBy === interaction.user.id,
            settings.djRoleId,
          ),
        );
        await interaction.reply({
          content: result.skipped ? copy.skipped : copy.vote(result.votes, result.required),
          ephemeral: true,
        });
        break;
      }
      case 'stop': {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        session.stop();
        await interaction.editReply(copy.stopped);
        break;
      }
      case 'leave':
        this.dependencies.sessions.remove(interaction.guildId);
        await interaction.reply({ content: copy.left, ephemeral: true });
        break;
      case 'remove': {
        const removed = session.remove(interaction.options.getInteger('position', true));
        await interaction.reply({ content: copy.removed(removed.title), ephemeral: true });
        break;
      }
      case 'move':
        session.move(
          interaction.options.getInteger('from', true),
          interaction.options.getInteger('to', true),
        );
        await interaction.reply({ content: copy.reordered, ephemeral: true });
        break;
      case 'clear':
        session.clear();
        await interaction.reply({ content: copy.cleared, ephemeral: true });
        break;
      case 'shuffle':
        session.shuffle();
        await interaction.reply({ content: copy.shuffled, ephemeral: true });
        break;
      case 'loop':
        session.setLoop(interaction.options.getString('mode', true) as LoopMode);
        await interaction.reply({ content: copy.loopUpdated, ephemeral: true });
        break;
      case 'autoplay':
        session.setAutoplay(interaction.options.getBoolean('enabled', true));
        await interaction.reply({ content: copy.autoplayUpdated, ephemeral: true });
        break;
    }
  }

  private async handleButton(interaction: ButtonInteraction<'cached'>): Promise<void> {
    if (interaction.customId === 'lucio:spotify-disconnect') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        throw new LucioError('NOT_AUTHORIZED', 'Necesitas Gestionar servidor.', 403);
      }
      this.dependencies.spotifyOAuth?.disconnect(interaction.guildId);
      const locale = this.dependencies.settings.get(interaction.guildId).locale;
      await interaction.reply({
        content: messages(locale).spotifyDisconnected,
        ephemeral: true,
      });
      return;
    }
    const session = this.requireSession(interaction.guildId);
    this.requireSameVoice(interaction, session.voiceChannelId);
    this.dependencies.limiter.consume(
      `control:${interaction.guildId}:${interaction.user.id}`,
      LIMITS.controlsPerMinute,
      60_000,
    );
    const action = interaction.customId.slice('lucio:'.length);
    const settings = this.dependencies.settings.get(interaction.guildId);
    if (action === 'pause') {
      if (session.snapshot().state.status === 'paused') session.resume();
      else session.pause();
    } else if (action === 'skip')
      await session.voteSkip(
        interaction.user.id,
        this.canSkipImmediately(
          interaction.member,
          session.current?.requestedBy === interaction.user.id,
          settings.djRoleId,
        ),
      );
    else if (action === 'shuffle') session.shuffle();
    else if (action === 'loop') session.setLoop(nextLoop(session.loopMode));
    else if (action === 'autoplay') session.setAutoplay(!session.autoplay);
    else if (action === 'stop') session.stop();
    await interaction.reply({ content: messages(settings.locale).controlApplied, ephemeral: true });
  }

  private async handleSetup(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      throw new LucioError('NOT_AUTHORIZED', 'Necesitas Gestionar servidor.', 403);
    }
    const copy = messages(this.dependencies.settings.get(interaction.guildId).locale);
    const spotify = this.dependencies.spotifyOAuth;
    if (!spotify) {
      await interaction.reply({ content: copy.spotifySetupUnavailable, ephemeral: true });
      return;
    }
    const connected = spotify.isConnected(interaction.guildId);
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(connected ? copy.spotifyReconnect : copy.spotifyConnect)
        .setURL(spotify.createAuthorizationUrl(interaction.guildId, interaction.channelId)),
    );
    if (connected) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId('lucio:spotify-disconnect')
          .setStyle(ButtonStyle.Danger)
          .setLabel(copy.spotifyDisconnect),
      );
    }
    await interaction.reply({
      content: connected ? copy.spotifySetupConnected : copy.spotifySetupReady,
      components: [buttons],
      ephemeral: true,
    });
  }

  private spotifyPrompt(
    interaction: ChatInputCommandInteraction<'cached'>,
    input: string,
    locale: 'es' | 'en',
  ): SpotifyPrompt | null {
    const url = parseSupportedUrl(input);
    if (!url || !isSpotifyUrl(url)) return null;
    const resource = parseSpotifyResource(url);
    if (!resource || this.dependencies.spotifyOAuth?.isConnected(interaction.guildId)) return null;
    const copy = messages(locale);
    const isManager = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    const authorizationUrl = isManager
      ? this.dependencies.spotifyOAuth?.createAuthorizationUrl(
          interaction.guildId,
          interaction.channelId,
        )
      : undefined;
    const components = authorizationUrl
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Link)
              .setLabel(copy.spotifyConnect)
              .setURL(authorizationUrl),
          ),
        ]
      : [];
    const guidance = isManager
      ? this.dependencies.spotifyOAuth
        ? copy.spotifySetupAdmin
        : copy.spotifySetupUnavailable
      : copy.spotifySetupMember;
    const playlistBlocked = resource.kind === 'playlist';
    return {
      content: playlistBlocked ? `${guidance}\n\n${copy.spotifyPlaylistBlocked}` : guidance,
      components,
      playlistBlocked,
    };
  }

  private async handleGuildCreate(guild: Guild): Promise<void> {
    const copy = messages(this.dependencies.settings.get(guild.id).locale);
    const candidates = [guild.systemChannel, ...guild.channels.cache.values()];
    const channel = candidates.find((candidate) => candidate?.isSendable());
    if (!channel?.isSendable()) return;
    try {
      await channel.send(copy.initialSetup);
    } catch (error) {
      this.dependencies.logger.warn(
        { err: error, guildId: guild.id },
        'initial setup notice failed',
      );
    }
  }

  private async handleSettings(interaction: ChatInputCommandInteraction<'cached'>): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      throw new LucioError('NOT_AUTHORIZED', 'Necesitas Gestionar servidor.', 403);
    }
    const subcommand = interaction.options.getSubcommand();
    const patch =
      subcommand === 'language'
        ? { locale: interaction.options.getString('value', true) as 'es' | 'en' }
        : subcommand === 'channel'
          ? { commandChannelId: interaction.options.getChannel('value')?.id ?? null }
          : { djRoleId: interaction.options.getRole('value')?.id ?? null };
    const next = this.dependencies.settings.update(interaction.guildId, patch);
    await interaction.reply({ content: messages(next.locale).settingsUpdated, ephemeral: true });
  }

  private requireVoice(interaction: ChatInputCommandInteraction<'cached'>): VoiceBasedChannel {
    const channel = interaction.member.voice.channel;
    if (!channel) throw new LucioError('NOT_IN_VOICE', 'Debes estar en un canal de voz.', 403);
    return channel;
  }

  private requireSameVoice(
    interaction: ChatInputCommandInteraction<'cached'> | ButtonInteraction<'cached'>,
    voiceChannelId: string,
  ): void {
    if (interaction.member.voice.channelId !== voiceChannelId) {
      throw new LucioError(
        'WRONG_VOICE_CHANNEL',
        'Debes estar en el mismo canal de voz que Lucio.',
        403,
      );
    }
  }

  private requireSession(guildId: string) {
    const session = this.dependencies.sessions.get(guildId);
    if (!session) throw new LucioError('EMPTY_QUEUE', 'No hay una sesión activa.', 404);
    return session;
  }

  private canSkipImmediately(
    member: GuildMember,
    requested: boolean,
    djRoleId: string | null,
  ): boolean {
    return (
      requested ||
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      (djRoleId !== null && member.roles.cache.has(djRoleId))
    );
  }

  private async replyError(interaction: Interaction, error: unknown): Promise<void> {
    const lucioError =
      error instanceof LucioError
        ? error
        : new LucioError('INTERNAL_ERROR', 'Ha ocurrido un error inesperado.', 500);
    const code = lucioError.code;
    this.dependencies.logger.error({ err: error, errorCode: code }, 'interaction failed');
    if (!interaction.isRepliable()) return;
    const locale = interaction.guildId
      ? this.dependencies.settings.get(interaction.guildId).locale
      : 'es';
    const content = `${localizedError(locale, code, lucioError.message)} \`${code}\``;
    if (interaction.deferred || interaction.replied) await interaction.editReply({ content });
    else await interaction.reply({ content, ephemeral: true });
  }
}

interface SpotifyPrompt {
  content: string;
  components: ActionRowBuilder<ButtonBuilder>[];
  playlistBlocked: boolean;
}

function withSpotifyPrompt(confirmation: string, prompt: SpotifyPrompt | null): string {
  return prompt ? `${prompt.content}\n\n${confirmation}` : confirmation;
}

function countHumanListeners(channel: VoiceBasedChannel): number {
  return channel.members.filter((member) => !member.user.bot).size;
}

function nextLoop(mode: LoopMode): LoopMode {
  return mode === 'off' ? 'track' : mode === 'track' ? 'queue' : 'off';
}

function formatQueue(snapshot: SessionSnapshot, locale: 'es' | 'en'): string {
  const copy = messages(locale);
  const lines = snapshot.queue
    .slice(0, 10)
    .map((track, index) => `${index + 1}. **${track.title}** — ${track.artist}`);
  if (snapshot.queue.length > 10) lines.push(copy.more(snapshot.queue.length - 10));
  return lines.length ? lines.join('\n') : copy.emptyQueue;
}

function playConfirmation(
  copy: ReturnType<typeof messages>,
  resolution: {
    initial: readonly unknown[];
    remaining: (() => Promise<unknown[]>) | null;
    expectedCount: number;
  },
): string {
  const pending = Math.max(0, resolution.expectedCount - resolution.initial.length);
  return resolution.remaining && pending > 0
    ? copy.resolvingRemaining(pending)
    : copy.added(resolution.initial.length);
}
