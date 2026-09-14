import type {
  ProgressiveResolution,
  ResolveRequest,
  SourceAdapter,
  Track,
} from '../../shared/index.js';
import { LucioError } from '../domain/errors.js';
import { isSpotifyUrl, parseSupportedUrl } from './url-policy.js';
import type { YtDlpSource } from './ytdlp-source.js';

interface SpotifyArtist {
  name: string;
}
interface SpotifyTrack {
  type?: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
}
interface SpotifyAlbum {
  tracks: { items: SpotifyTrack[] };
}

type SpotifyResource = { kind: 'track' | 'album'; id: string } | { kind: 'playlist'; id: string };

interface SpotifyPlaylistPage {
  items: Array<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null }>;
  total: number;
  next: string | null;
}

export interface SpotifyUserTokenProvider {
  isConnected(guildId: string): boolean;
  getAccessToken(guildId: string): Promise<string>;
}

export class SpotifySource implements SourceAdapter {
  readonly name = 'spotify';
  #token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly youtube: YtDlpSource,
    private readonly userTokens?: SpotifyUserTokenProvider,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  supports(input: string): boolean {
    const url = parseSupportedUrl(input);
    return url !== null && isSpotifyUrl(url);
  }

  async resolve(request: ResolveRequest): Promise<Track[]> {
    const result = await this.resolveProgressively(request);
    return [...result.initial, ...(result.remaining ? await result.remaining() : [])];
  }

  async resolveProgressively(request: ResolveRequest): Promise<ProgressiveResolution> {
    const url = parseSupportedUrl(request.input);
    if (!url || !isSpotifyUrl(url)) return { initial: [], remaining: null, expectedCount: 0 };
    const resource = parseSpotifyResource(url);
    if (!resource) {
      throw new LucioError('UNSUPPORTED_INPUT', 'El enlace de Spotify no es válido.');
    }
    const hasUserConnection = this.userTokens?.isConnected(request.guildId) ?? false;
    if (resource.kind === 'playlist' && !hasUserConnection) {
      throw new LucioError(
        'SPOTIFY_NOT_CONFIGURED',
        'Spotify no está vinculado en este servidor. Un administrador debe ejecutar `/setup`.',
      );
    }
    const { kind, id } = resource;
    let token: string;
    try {
      token = hasUserConnection
        ? await this.userTokens!.getAccessToken(request.guildId)
        : await this.getToken();
    } catch (error) {
      if (kind === 'playlist') throw error;
      token = await this.getToken();
    }
    if (kind === 'playlist') {
      const tracks = await this.getPlaylistTracks(id, token, request.limit);
      return this.resolveMetadataProgressively(tracks, request.requestedBy);
    }
    const response = await this.fetcher(
      `https://api.spotify.com/v1/${kind}s/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) {
      throw new LucioError('SOURCE_UNAVAILABLE', 'Spotify no ha podido leer ese enlace.', 502);
    }
    const tracks =
      kind === 'track'
        ? [(await response.json()) as SpotifyTrack]
        : ((await response.json()) as SpotifyAlbum).tracks.items;
    return this.resolveMetadataProgressively(tracks.slice(0, request.limit), request.requestedBy);
  }

  private async resolveMetadataProgressively(
    selected: SpotifyTrack[],
    requestedBy: string,
  ): Promise<ProgressiveResolution> {
    let firstMatch: Track | null = null;
    let firstMatchIndex = -1;
    for (let index = 0; index < selected.length && !firstMatch; index += 1) {
      firstMatch = await this.resolveTrack(selected[index]!, requestedBy);
      if (firstMatch) firstMatchIndex = index;
    }
    if (!firstMatch) return { initial: [], remaining: null, expectedCount: selected.length };
    const remainingMetadata = selected.slice(firstMatchIndex + 1);
    return {
      initial: [firstMatch],
      remaining:
        remainingMetadata.length > 0
          ? () =>
              mapWithConcurrency(remainingMetadata, 2, (metadata) =>
                this.resolveTrack(metadata, requestedBy),
              ).then((items) => items.filter((item): item is Track => item !== null))
          : null,
      expectedCount: selected.length,
    };
  }

  private async getPlaylistTracks(
    playlistId: string,
    token: string,
    maximum: number,
  ): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = Math.min(50, maximum);
    while (tracks.length < maximum) {
      const parameters = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const response = await this.fetcher(
        `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/items?${parameters.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (response.status === 403) {
        throw new LucioError(
          'SPOTIFY_PLAYLIST_FORBIDDEN',
          'La cuenta vinculada debe ser propietaria o colaboradora de esta playlist de Spotify.',
          403,
        );
      }
      if (!response.ok) {
        throw new LucioError('SOURCE_UNAVAILABLE', 'Spotify no ha podido leer esa playlist.', 502);
      }
      const page = (await response.json()) as SpotifyPlaylistPage;
      const received = page.items.length;
      tracks.push(
        ...page.items
          .map((entry) => entry.item ?? entry.track ?? null)
          .filter(
            (track): track is SpotifyTrack =>
              track !== null &&
              (track.type === undefined || track.type === 'track') &&
              typeof track.name === 'string' &&
              Array.isArray(track.artists),
          ),
      );
      offset += received;
      if (!page.next || received === 0 || offset >= page.total || offset >= maximum) break;
    }
    return tracks.slice(0, maximum);
  }

  private async resolveTrack(metadata: SpotifyTrack, requestedBy: string): Promise<Track | null> {
    const artist = metadata.artists.map((item) => item.name).join(', ');
    const candidates = await this.youtube.searchCandidates(
      `${artist} - ${metadata.name} official audio`,
      requestedBy,
      5,
    );
    const match = chooseMatch(metadata, candidates);
    return match ? { ...match, source: 'spotify' } : null;
  }

  private async getToken(): Promise<string> {
    if (this.#token && this.#token.expiresAt > Date.now() + 30_000) return this.#token.value;
    const body = new URLSearchParams({ grant_type: 'client_credentials' });
    const response = await this.fetcher('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new LucioError('SOURCE_UNAVAILABLE', 'Spotify no está disponible.', 502);
    const payload = (await response.json()) as { access_token: string; expires_in: number };
    this.#token = {
      value: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1_000,
    };
    return this.#token.value;
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  maximum: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(maximum, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export function parseSpotifyResource(url: URL): SpotifyResource | null {
  const segments = url.pathname.split('/').filter(Boolean);
  const kindIndex = segments.findIndex(
    (segment) => segment === 'track' || segment === 'album' || segment === 'playlist',
  );
  const kind = segments[kindIndex];
  const id = segments[kindIndex + 1];
  if (!id || (kind !== 'track' && kind !== 'album' && kind !== 'playlist')) return null;
  return { kind, id };
}

function chooseMatch(metadata: SpotifyTrack, candidates: Track[]): Track | null {
  const expectedTitle = normalize(metadata.name);
  const expectedArtist = normalize(metadata.artists.map((artist) => artist.name).join(' '));
  let best: { track: Track; score: number } | null = null;
  for (const track of candidates) {
    const title = normalize(`${track.artist} ${track.title}`);
    const titleScore =
      expectedTitle.split(' ').filter((word) => title.includes(word)).length /
      Math.max(1, expectedTitle.split(' ').length);
    const artistScore =
      expectedArtist.split(' ').filter((word) => title.includes(word)).length /
      Math.max(1, expectedArtist.split(' ').length);
    const durationDelta = Math.abs(track.durationMs - metadata.duration_ms);
    const durationScore = durationDelta <= 10_000 ? 1 : durationDelta <= 30_000 ? 0.5 : 0;
    const score = titleScore * 0.5 + artistScore * 0.3 + durationScore * 0.2;
    if (!best || score > best.score) best = { track, score };
  }
  return best && best.score >= 0.65 ? best.track : null;
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
