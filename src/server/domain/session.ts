import { EventEmitter } from 'node:events';
import {
  LIMITS,
  type AudioPipeline,
  type LoopMode,
  type PlaybackState,
  type QueueItem,
  type SessionSnapshot,
  type SourceAdapter,
  type Track,
} from '../../shared/index.js';
import type { Logger } from '../logger.js';
import { TrackQueue } from './queue.js';

export interface SessionOptions {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  pipeline: AudioPipeline;
  autoplaySource: SourceAdapter;
  logger: Logger;
  getListenerCount: () => number;
  onTerminate: () => void;
}

export interface SkipVoteResult {
  skipped: boolean;
  votes: number;
  required: number;
}

export class MusicSession extends EventEmitter {
  readonly queue = new TrackQueue();
  readonly #skipVoters = new Set<string>();
  readonly #recentSourceIds: string[] = [];
  #current: QueueItem | null = null;
  #status: PlaybackState['status'] = 'idle';
  #startedAt: Date | null = null;
  #pausedAt: Date | null = null;
  #accumulatedPauseMs = 0;
  #loopMode: LoopMode = 'off';
  #autoplay = false;
  #panelMessageId: string | null = null;
  #idleTimer: NodeJS.Timeout | null = null;
  #terminated = false;
  #advancing = false;
  #importGeneration = 0;

  constructor(private readonly options: SessionOptions) {
    super();
  }

  get guildId(): string {
    return this.options.guildId;
  }
  get voiceChannelId(): string {
    return this.options.voiceChannelId;
  }
  get current(): QueueItem | null {
    return this.#current;
  }
  get loopMode(): LoopMode {
    return this.#loopMode;
  }
  get autoplay(): boolean {
    return this.#autoplay;
  }

  setPanelMessage(id: string): void {
    this.#panelMessageId = id;
    this.notify();
  }

  async add(tracks: Track[]): Promise<QueueItem[]> {
    this.cancelIdleTimer();
    const firstQueued = this.queue.peek();
    const items = this.queue.enqueue(tracks);
    this.notify();
    if (!this.#current) await this.advance();
    else if (!firstQueued) {
      const next = this.queue.peek();
      if (next) void this.prepareNext(next);
    }
    return items;
  }

  addDeferred(tracks: Promise<Track[]>): void {
    const generation = this.#importGeneration;
    void tracks
      .then(async (resolved) => {
        if (this.#terminated || generation !== this.#importGeneration || resolved.length === 0)
          return;
        await this.add(resolved);
      })
      .catch(() =>
        this.options.logger.warn(
          { errorCode: 'BACKGROUND_IMPORT_FAILED' },
          'background track import failed',
        ),
      );
  }

  pause(): boolean {
    if (this.#status !== 'playing' || !this.options.pipeline.pause()) return false;
    this.#status = 'paused';
    this.#pausedAt = new Date();
    this.notify();
    return true;
  }

  resume(): boolean {
    if (this.#status !== 'paused' || !this.options.pipeline.resume()) return false;
    if (this.#pausedAt) this.#accumulatedPauseMs += Date.now() - this.#pausedAt.getTime();
    this.#pausedAt = null;
    this.#status = 'playing';
    this.notify();
    return true;
  }

  async skip(): Promise<void> {
    this.#loopMode = this.#loopMode === 'track' ? 'off' : this.#loopMode;
    this.options.pipeline.stop();
    await this.advance();
  }

  async voteSkip(userId: string, immediate: boolean): Promise<SkipVoteResult> {
    const listeners = this.options.getListenerCount();
    const required = Math.max(1, Math.floor(listeners / 2) + 1);
    if (immediate) {
      await this.skip();
      return { skipped: true, votes: required, required };
    }
    this.#skipVoters.add(userId);
    if (this.#skipVoters.size >= required) {
      await this.skip();
      return { skipped: true, votes: this.#skipVoters.size, required };
    }
    this.notify();
    return { skipped: false, votes: this.#skipVoters.size, required };
  }

  setLoop(mode: LoopMode): void {
    this.#loopMode = mode;
    this.notify();
  }

  setAutoplay(enabled: boolean): void {
    this.#autoplay = enabled;
    this.notify();
  }

  clear(): void {
    this.#importGeneration += 1;
    this.queue.clear();
    this.notify();
  }

  shuffle(): void {
    this.queue.shuffle();
    this.notify();
  }

  remove(position: number): QueueItem {
    const item = this.queue.remove(position);
    this.notify();
    return item;
  }

  move(from: number, to: number): void {
    this.queue.move(from, to);
    this.notify();
  }

  stop(): void {
    this.#importGeneration += 1;
    this.queue.clear();
    this.#autoplay = false;
    this.#loopMode = 'off';
    this.options.pipeline.stop();
    this.#current = null;
    this.#status = 'idle';
    this.scheduleIdleTimer();
    this.notify();
  }

  terminate(): void {
    if (this.#terminated) return;
    this.#terminated = true;
    this.#importGeneration += 1;
    this.cancelIdleTimer();
    this.options.pipeline.destroy();
    this.removeAllListeners();
    this.options.onTerminate();
  }

  snapshot(): SessionSnapshot {
    const listeners = this.options.getListenerCount();
    return {
      capturedAt: new Date().toISOString(),
      guildId: this.options.guildId,
      voiceChannelId: this.options.voiceChannelId,
      textChannelId: this.options.textChannelId,
      panelMessageId: this.#panelMessageId,
      state: {
        status: this.#status,
        current: this.#current ? { ...this.#current } : null,
        positionMs: this.positionMs(),
        startedAt: this.#startedAt?.toISOString() ?? null,
        loopMode: this.#loopMode,
        autoplay: this.#autoplay,
      },
      queue: this.queue.snapshot(),
      listenerCount: listeners,
      skipVotes: this.#skipVoters.size,
      skipVotesRequired: Math.max(1, Math.floor(listeners / 2) + 1),
    };
  }

  private async advance(): Promise<void> {
    if (this.#advancing || this.#terminated) return;
    this.#advancing = true;
    try {
      const previous = this.#current;
      if (previous) {
        this.remember(previous.sourceId);
        if (this.#loopMode === 'track') this.queue.prepend(previous);
        else if (this.#loopMode === 'queue') this.queue.enqueue([previous]);
      }
      this.#current = this.queue.dequeue();
      if (!this.#current && this.#autoplay && previous) {
        const related = await this.options.autoplaySource.related?.(
          previous,
          new Set(this.#recentSourceIds),
        );
        if (related) this.#current = { ...related, enqueuedAt: new Date().toISOString() };
      }
      this.#skipVoters.clear();
      if (!this.#current) {
        this.#status = 'idle';
        this.#startedAt = null;
        this.scheduleIdleTimer();
        this.notify();
        return;
      }
      this.cancelIdleTimer();
      this.#status = 'loading';
      this.#startedAt = null;
      this.#pausedAt = null;
      this.#accumulatedPauseMs = 0;
      this.notify();
      const selectedTrack = this.#current;
      try {
        await this.options.pipeline.play(
          selectedTrack,
          () => void this.advance(),
          (error) => {
            if (this.#current?.id !== selectedTrack.id) return;
            if (this.#loopMode === 'track') this.#loopMode = 'off';
            this.options.logger.warn(
              { errorCode: 'SOURCE_UNAVAILABLE', err: error },
              'audio track failed',
            );
            this.emit('trackError', { code: 'SOURCE_UNAVAILABLE', track: this.#current });
            void this.advance();
          },
        );
        if (
          this.#terminated ||
          this.#status !== 'loading' ||
          this.#current?.id !== selectedTrack.id
        )
          return;
        this.#startedAt = new Date();
        this.#status = 'playing';
        this.notify();
        const next = this.queue.peek();
        if (next) void this.prepareNext(next);
      } catch (error) {
        if (
          this.#terminated ||
          this.#status !== 'loading' ||
          this.#current?.id !== selectedTrack.id
        )
          return;
        if (this.#loopMode === 'track') this.#loopMode = 'off';
        this.#status = 'idle';
        this.options.logger.warn(
          { errorCode: 'SOURCE_UNAVAILABLE', err: error },
          'audio track failed to start',
        );
        this.emit('trackError', { code: 'SOURCE_UNAVAILABLE', track: this.#current });
        setTimeout(() => void this.advance(), 0).unref();
      }
    } finally {
      this.#advancing = false;
    }
  }

  private positionMs(): number {
    if (!this.#startedAt) return 0;
    const endpoint = this.#pausedAt?.getTime() ?? Date.now();
    return Math.max(0, endpoint - this.#startedAt.getTime() - this.#accumulatedPauseMs);
  }

  private remember(sourceId: string): void {
    this.#recentSourceIds.push(sourceId);
    if (this.#recentSourceIds.length > LIMITS.recentAutoplaySize) this.#recentSourceIds.shift();
  }

  private async prepareNext(track: Track): Promise<void> {
    try {
      await this.options.pipeline.prepare?.(track);
    } catch {
      this.options.logger.debug(
        { errorCode: 'PREFETCH_UNAVAILABLE' },
        'next track prefetch failed',
      );
    }
  }

  private scheduleIdleTimer(): void {
    this.cancelIdleTimer();
    this.#idleTimer = setTimeout(() => this.terminate(), LIMITS.idleDisconnectMs);
    this.#idleTimer.unref();
  }

  private cancelIdleTimer(): void {
    if (this.#idleTimer) clearTimeout(this.#idleTimer);
    this.#idleTimer = null;
  }

  private notify(): void {
    this.emit('change', this.snapshot());
  }
}
