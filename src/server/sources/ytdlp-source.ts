import { createHash } from 'node:crypto';
import { ulid } from 'ulid';
import {
  LIMITS,
  type ProgressiveResolution,
  type ResolveRequest,
  type SourceAdapter,
  type Track,
} from '../../shared/index.js';
import { LucioError } from '../domain/errors.js';
import type { ProcessRunner } from './process-runner.js';
import { isYouTubeUrl, parseSupportedUrl } from './url-policy.js';
import { YTDLP_AUDIO_FORMAT, withYtDlpRuntime, type YtDlpRuntimeOptions } from './ytdlp-options.js';
import { PlaybackTicketStore, type PlaybackTicketCandidate } from './playback-ticket-store.js';

interface YtDlpEntry {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  webpage_url?: string;
  url?: string;
  duration?: number;
  thumbnail?: string;
  live_status?: string;
  is_live?: boolean;
  ext?: string;
  acodec?: string;
  protocol?: string;
  http_headers?: Record<string, string>;
  requested_downloads?: PlaybackTicketCandidate[];
  entries?: YtDlpEntry[];
}

interface CachedResolution {
  expiresAt: number;
  entries: YtDlpEntry[];
}

const RESOLUTION_CACHE_TTL_MS = 10 * 60_000;
const RESOLUTION_CACHE_MAX_ENTRIES = 200;

export class YtDlpSource implements SourceAdapter {
  readonly name = 'youtube';
  readonly playbackTickets = new PlaybackTicketStore();
  readonly #resolutionCache = new Map<string, CachedResolution>();

  constructor(
    private readonly runner: ProcessRunner,
    private readonly executable: string,
    private readonly runtimeOptions: YtDlpRuntimeOptions = {},
  ) {}

  supports(input: string): boolean {
    const url = parseSupportedUrl(input);
    return url === null || isYouTubeUrl(url);
  }

  async resolve(request: ResolveRequest): Promise<Track[]> {
    return this.resolveInternal(request, false);
  }

  async resolveProgressively(request: ResolveRequest): Promise<ProgressiveResolution> {
    const tracks = await this.resolve(request);
    const [first, ...remaining] = tracks;
    return {
      initial: first ? [first] : [],
      remaining: remaining.length > 0 ? () => Promise.resolve(remaining) : null,
      expectedCount: tracks.length,
    };
  }

  searchCandidates(input: string, requestedBy: string, limit: number): Promise<Track[]> {
    return this.resolveInternal({ input, requestedBy, limit }, true);
  }

  private async resolveInternal(
    request: Pick<ResolveRequest, 'input' | 'requestedBy' | 'limit'>,
    multipleSearchResults: boolean,
  ): Promise<Track[]> {
    const url = parseSupportedUrl(request.input);
    if (url && !isYouTubeUrl(url)) return [];
    const isPlaylist = url?.searchParams.has('list') ?? false;
    const target = url
      ? url.toString()
      : `ytsearch${multipleSearchResults ? Math.min(10, request.limit) : 1}:${request.input}`;
    const cacheKey = resolutionCacheKey(target, isPlaylist, multipleSearchResults, request.limit);
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached
        .slice(0, url || multipleSearchResults ? request.limit : 1)
        .map((entry) => this.toTrack(entry, request.requestedBy))
        .filter((track): track is Track => track !== null);
    }
    const args = withYtDlpRuntime(
      buildResolveArgs({
        isPlaylist,
        multipleSearchResults,
        limit: request.limit,
        target,
      }),
      this.runtimeOptions,
    );
    const result = await this.runner.run(this.executable, args);
    if (result.exitCode !== 0) {
      throw new LucioError('SOURCE_UNAVAILABLE', ytDlpFailureMessage(result.stderr), 502);
    }
    const payload = parsePayload(result.stdout);
    const entries = payload.entries?.length ? payload.entries : [payload];
    const safeEntries = entries.map(cacheableEntry);
    this.setCached(cacheKey, safeEntries);
    return safeEntries
      .slice(0, url || multipleSearchResults ? request.limit : 1)
      .map((entry) => this.toTrack(entry, request.requestedBy))
      .filter((track): track is Track => track !== null);
  }

  async related(track: Track, recentSourceIds: ReadonlySet<string>): Promise<Track | null> {
    if (track.sourceId.length === 0) return null;
    const result = await this.runner.run(
      this.executable,
      withYtDlpRuntime(
        [
          '--flat-playlist',
          '--playlist-end',
          '25',
          '--dump-single-json',
          `https://www.youtube.com/watch?v=${encodeURIComponent(track.sourceId)}&list=RD${encodeURIComponent(track.sourceId)}`,
        ],
        this.runtimeOptions,
      ),
    );
    if (result.exitCode !== 0) return null;
    const payload = JSON.parse(result.stdout) as YtDlpEntry;
    for (const entry of payload.entries ?? []) {
      if (!entry.id || recentSourceIds.has(entry.id) || entry.id === track.sourceId) continue;
      const candidate = this.toTrack(entry, 'autoplay');
      if (candidate) return candidate;
    }
    return null;
  }

  private toTrack(entry: YtDlpEntry, requestedBy: string): Track | null {
    if (!entry.id || !entry.title) return null;
    const durationMs = Math.round((entry.duration ?? 0) * 1_000);
    const isLive = entry.is_live === true || entry.live_status === 'is_live';
    if (isLive || durationMs <= 0 || durationMs > LIMITS.maxTrackDurationMs) return null;
    const track: Track = {
      id: ulid(),
      source: 'youtube',
      sourceId: entry.id,
      title: entry.title,
      artist: entry.uploader ?? entry.channel ?? 'YouTube',
      url: entry.webpage_url ?? `https://www.youtube.com/watch?v=${entry.id}`,
      durationMs,
      thumbnailUrl: entry.thumbnail ?? null,
      requestedBy,
      isLive: false,
      audioFormat:
        entry.ext && entry.acodec && entry.acodec !== 'none'
          ? { ext: entry.ext, codec: entry.acodec }
          : null,
    };
    const selected = selectedPlaybackCandidate(entry);
    this.playbackTickets.set(track.id, selected);
    return track;
  }

  private getCached(key: string): YtDlpEntry[] | null {
    const cached = this.#resolutionCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
      this.#resolutionCache.delete(key);
      return null;
    }
    this.#resolutionCache.delete(key);
    this.#resolutionCache.set(key, cached);
    return cached.entries;
  }

  private setCached(key: string, entries: YtDlpEntry[]): void {
    this.#resolutionCache.set(key, {
      expiresAt: Date.now() + RESOLUTION_CACHE_TTL_MS,
      entries,
    });
    while (this.#resolutionCache.size > RESOLUTION_CACHE_MAX_ENTRIES) {
      const oldest = this.#resolutionCache.keys().next().value;
      if (!oldest) break;
      this.#resolutionCache.delete(oldest);
    }
  }
}

function resolutionCacheKey(
  target: string,
  isPlaylist: boolean,
  multipleSearchResults: boolean,
  limit: number,
): string {
  return createHash('sha256')
    .update(`${isPlaylist}:${multipleSearchResults}:${limit}:${target}`)
    .digest('hex');
}

function selectedPlaybackCandidate(entry: YtDlpEntry): PlaybackTicketCandidate {
  const selected =
    entry.requested_downloads?.find(
      (candidate) => candidate.acodec && candidate.acodec !== 'none',
    ) ?? entry;
  const url = selected.url ?? entry.url;
  const ext = selected.ext ?? entry.ext;
  const acodec = selected.acodec ?? entry.acodec;
  const protocol = selected.protocol ?? entry.protocol;
  const httpHeaders = selected.http_headers ?? entry.http_headers;
  return {
    ...(url !== undefined ? { url } : {}),
    ...(ext !== undefined ? { ext } : {}),
    ...(acodec !== undefined ? { acodec } : {}),
    ...(protocol !== undefined ? { protocol } : {}),
    ...(httpHeaders !== undefined ? { http_headers: httpHeaders } : {}),
  };
}

function cacheableEntry(entry: YtDlpEntry): YtDlpEntry {
  return {
    ...(entry.id !== undefined ? { id: entry.id } : {}),
    ...(entry.title !== undefined ? { title: entry.title } : {}),
    ...(entry.uploader !== undefined ? { uploader: entry.uploader } : {}),
    ...(entry.channel !== undefined ? { channel: entry.channel } : {}),
    ...(entry.webpage_url !== undefined ? { webpage_url: entry.webpage_url } : {}),
    ...(entry.url !== undefined ? { url: entry.url } : {}),
    ...(entry.duration !== undefined ? { duration: entry.duration } : {}),
    ...(entry.thumbnail !== undefined ? { thumbnail: entry.thumbnail } : {}),
    ...(entry.live_status !== undefined ? { live_status: entry.live_status } : {}),
    ...(entry.is_live !== undefined ? { is_live: entry.is_live } : {}),
    ...(entry.ext !== undefined ? { ext: entry.ext } : {}),
    ...(entry.acodec !== undefined ? { acodec: entry.acodec } : {}),
    ...(entry.protocol !== undefined ? { protocol: entry.protocol } : {}),
    ...(entry.http_headers !== undefined ? { http_headers: { ...entry.http_headers } } : {}),
    ...(entry.requested_downloads !== undefined
      ? {
          requested_downloads: entry.requested_downloads.map((candidate) => ({
            ...(candidate.url !== undefined ? { url: candidate.url } : {}),
            ...(candidate.ext !== undefined ? { ext: candidate.ext } : {}),
            ...(candidate.acodec !== undefined ? { acodec: candidate.acodec } : {}),
            ...(candidate.protocol !== undefined ? { protocol: candidate.protocol } : {}),
            ...(candidate.http_headers !== undefined
              ? { http_headers: { ...candidate.http_headers } }
              : {}),
          })),
        }
      : {}),
  };
}

function buildResolveArgs(options: {
  isPlaylist: boolean;
  multipleSearchResults: boolean;
  limit: number;
  target: string;
}): string[] {
  if (options.isPlaylist || options.multipleSearchResults) {
    return [
      '--flat-playlist',
      '--playlist-end',
      String(Math.min(options.limit, LIMITS.maxPlaylistItems)),
      '--dump-single-json',
      options.target,
    ];
  }
  return ['--dump-single-json', '--no-playlist', '-f', YTDLP_AUDIO_FORMAT, options.target];
}

function parsePayload(stdout: string): YtDlpEntry {
  try {
    return JSON.parse(stdout) as YtDlpEntry;
  } catch {
    throw new LucioError(
      'SOURCE_UNAVAILABLE',
      'La fuente de audio devolvió una respuesta inválida.',
      502,
    );
  }
}

function ytDlpFailureMessage(stderr: string): string {
  const normalized = stderr.toLowerCase();
  if (normalized.includes('sign in to confirm') || normalized.includes('not a bot')) {
    return 'YouTube exige verificar el servidor y no permite resolver la pista en este momento.';
  }
  if (normalized.includes('javascript runtime')) {
    return 'El runtime necesario para resolver YouTube no está disponible.';
  }
  if (normalized.includes('unsupported url')) {
    return 'El enlace no está soportado por la fuente de audio.';
  }
  return 'YouTube no ha podido resolver la solicitud.';
}
