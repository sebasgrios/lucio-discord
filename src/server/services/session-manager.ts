import {
  LIMITS,
  type AudioPipeline,
  type SessionSnapshot,
  type SourceAdapter,
} from '../../shared/index.js';
import { LucioError } from '../domain/errors.js';
import { MusicSession } from '../domain/session.js';
import type { Logger } from '../logger.js';

export interface CreateSessionRequest {
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  pipeline: AudioPipeline;
  autoplaySource: SourceAdapter;
  logger: Logger;
  getListenerCount: () => number;
}

export class SessionManager extends EventEmitter {
  readonly #sessions = new Map<string, MusicSession>();

  constructor() {
    super();
  }

  get(guildId: string): MusicSession | null {
    return this.#sessions.get(guildId) ?? null;
  }

  create(request: CreateSessionRequest): MusicSession {
    const current = this.get(request.guildId);
    if (current) {
      if (current.voiceChannelId !== request.voiceChannelId) {
        throw new LucioError('WRONG_VOICE_CHANNEL', 'Lucio ya está reproduciendo en otro canal.');
      }
      return current;
    }
    if (this.#sessions.size >= LIMITS.maxSessions) {
      throw new LucioError(
        'CAPACITY_REACHED',
        'Lucio está atendiendo otra sesión. Inténtalo más tarde.',
        503,
      );
    }
    const session = new MusicSession({
      ...request,
      onTerminate: () => {
        this.#sessions.delete(request.guildId);
        this.emit('change', request.guildId, null);
      },
    });
    this.#sessions.set(request.guildId, session);
    session.on('change', (snapshot: SessionSnapshot) =>
      this.emit('change', request.guildId, snapshot),
    );
    this.emit('change', request.guildId, session.snapshot());
    return session;
  }

  remove(guildId: string): void {
    this.#sessions.get(guildId)?.terminate();
  }

  snapshots(): SessionSnapshot[] {
    return [...this.#sessions.values()].map((session) => session.snapshot());
  }

  terminateAll(): void {
    for (const session of [...this.#sessions.values()]) session.terminate();
  }
}
import { EventEmitter } from 'node:events';
