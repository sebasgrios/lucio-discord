import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import type { SessionSnapshot } from '../../shared/index.js';
import type { MusicSession } from '../domain/session.js';
import { messages } from '../i18n.js';
import type { Logger } from '../logger.js';
import type { SettingsRepository } from '../persistence/settings-repository.js';

interface RenderState {
  latest: SessionSnapshot | null;
  running: boolean;
  lastTrackId: string | null;
}

export class DiscordPanelPresenter {
  readonly #attached = new WeakSet<MusicSession>();
  readonly #renderStates = new WeakMap<MusicSession, RenderState>();

  constructor(
    private readonly client: Client,
    private readonly settings: SettingsRepository,
    private readonly logger: Logger,
  ) {}

  attach(session: MusicSession): void {
    if (this.#attached.has(session)) return;
    this.#attached.add(session);
    this.#renderStates.set(session, { latest: null, running: false, lastTrackId: null });
    session.on('change', (snapshot: SessionSnapshot) => this.schedule(session, snapshot));
    this.schedule(session, session.snapshot());
  }

  private schedule(session: MusicSession, snapshot: SessionSnapshot): void {
    const state = this.#renderStates.get(session);
    if (!state) return;
    state.latest = snapshot;
    if (state.running) return;
    state.running = true;
    void this.drain(session, state);
  }

  private async drain(session: MusicSession, state: RenderState): Promise<void> {
    while (state.latest) {
      const snapshot = state.latest;
      state.latest = null;
      const currentTrackId = snapshot.state.current?.id ?? null;
      const replacePanel =
        state.lastTrackId !== null &&
        currentTrackId !== null &&
        state.lastTrackId !== currentTrackId;
      const rendered = await this.render(session, snapshot, replacePanel);
      if (rendered && currentTrackId) state.lastTrackId = currentTrackId;
    }
    state.running = false;
  }

  private async render(
    session: MusicSession,
    snapshot: SessionSnapshot,
    replacePanel: boolean,
  ): Promise<boolean> {
    try {
      const channel = await this.client.channels.fetch(snapshot.textChannelId);
      if (!channel?.isTextBased() || channel.isDMBased()) return false;
      const locale = this.settings.get(snapshot.guildId).locale;
      const copy = messages(locale);
      const current = snapshot.state.current;
      const embed = new EmbedBuilder()
        .setColor(0x88e828)
        .setTitle(current ? current.title : copy.readyTitle)
        .setDescription(
          current
            ? `**${current.artist}**\n${formatDuration(snapshot.state.positionMs)} / ${formatDuration(current.durationMs)}`
            : copy.readyBody,
        )
        .addFields(
          { name: copy.state, value: statusLabel(snapshot.state.status, locale), inline: true },
          { name: copy.queue, value: String(snapshot.queue.length), inline: true },
          { name: copy.listeners, value: String(snapshot.listenerCount), inline: true },
        )
        .setFooter({
          text: `Loop: ${snapshot.state.loopMode} · Autoplay: ${snapshot.state.autoplay ? 'on' : 'off'}`,
        });
      if (current?.thumbnailUrl) embed.setThumbnail(current.thumbnailUrl);

      const components = [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('lucio:pause')
            .setLabel(snapshot.state.status === 'paused' ? copy.resume : copy.pause)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('lucio:skip')
            .setLabel(copy.skip)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('lucio:shuffle')
            .setLabel(copy.shuffle)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('lucio:loop')
            .setLabel(copy.repeat)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('lucio:stop')
            .setLabel(copy.stop)
            .setStyle(ButtonStyle.Danger),
        ),
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('lucio:autoplay')
            .setLabel(`Autoplay ${snapshot.state.autoplay ? 'on' : 'off'}`)
            .setStyle(snapshot.state.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
        ),
      ];
      if (snapshot.panelMessageId) {
        const message = await channel.messages.fetch(snapshot.panelMessageId).catch(() => null);
        if (message) {
          if (replacePanel) await message.delete();
          else {
            await message.edit({ embeds: [embed], components });
            return true;
          }
        }
      }
      const message = await channel.send({ embeds: [embed], components });
      session.setPanelMessage(message.id);
      return true;
    } catch (error) {
      this.logger.warn({ err: error }, 'panel render failed');
      return false;
    }
  }
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function statusLabel(status: SessionSnapshot['state']['status'], locale: 'es' | 'en'): string {
  return locale === 'es'
    ? { idle: 'En espera', loading: 'Cargando', playing: 'Reproduciendo', paused: 'Pausado' }[
        status
      ]
    : { idle: 'Idle', loading: 'Loading', playing: 'Playing', paused: 'Paused' }[status];
}
