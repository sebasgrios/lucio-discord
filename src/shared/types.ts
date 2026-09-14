export type Locale = 'es' | 'en';
export type LoopMode = 'off' | 'track' | 'queue';
export type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused';

export interface GuildSettings {
  guildId: string;
  locale: Locale;
  commandChannelId: string | null;
  djRoleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: string;
  source: 'youtube' | 'spotify';
  sourceId: string;
  title: string;
  artist: string;
  url: string;
  durationMs: number;
  thumbnailUrl: string | null;
  requestedBy: string;
  isLive: boolean;
  audioFormat: {
    ext: string;
    codec: string;
  } | null;
}

export interface QueueItem extends Track {
  enqueuedAt: string;
}

export interface PlaybackState {
  status: PlaybackStatus;
  current: QueueItem | null;
  positionMs: number;
  startedAt: string | null;
  loopMode: LoopMode;
  autoplay: boolean;
}

export interface SessionSnapshot {
  capturedAt: string;
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  panelMessageId: string | null;
  state: PlaybackState;
  queue: QueueItem[];
  listenerCount: number;
  skipVotes: number;
  skipVotesRequired: number;
}

export interface ResolveRequest {
  guildId: string;
  input: string;
  requestedBy: string;
  limit: number;
}

export interface ProgressiveResolution {
  initial: Track[];
  remaining: (() => Promise<Track[]>) | null;
  expectedCount: number;
}

export interface SourceAdapter {
  readonly name: string;
  supports(input: string): boolean;
  resolve(request: ResolveRequest): Promise<Track[]>;
  resolveProgressively?(request: ResolveRequest): Promise<ProgressiveResolution>;
  related?(track: Track, recentSourceIds: ReadonlySet<string>): Promise<Track | null>;
}

export interface AudioHandle {
  stop(): void;
}

export interface AudioPipeline {
  play(track: Track, onIdle: () => void, onError: (error: Error) => void): Promise<AudioHandle>;
  prepare?(track: Track): Promise<void>;
  pause(): boolean;
  resume(): boolean;
  stop(): void;
  destroy(): void;
}

export type PlayerAction =
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skip' }
  | { type: 'stop' }
  | { type: 'shuffle' }
  | { type: 'clear' }
  | { type: 'autoplay'; enabled: boolean }
  | { type: 'loop'; mode: LoopMode }
  | { type: 'remove'; position: number }
  | { type: 'move'; from: number; to: number };
