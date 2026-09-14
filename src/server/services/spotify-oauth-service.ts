import { randomBytes } from 'node:crypto';
import { LucioError } from '../domain/errors.js';
import type {
  SpotifyConnectionRepository,
  SpotifyConnectionStatus,
} from '../persistence/spotify-connection-repository.js';

interface AuthorizationTicket {
  guildId: string;
  notificationChannelId: string | null;
  expiresAt: number;
}

export interface CompletedSpotifyAuthorization {
  guildId: string;
  notificationChannelId: string | null;
}

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface CachedAccessToken {
  value: string;
  expiresAt: number;
}

export interface SpotifyOAuthOptions {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class SpotifyOAuthService {
  readonly #tickets = new Map<string, AuthorizationTicket>();
  readonly #accessTokens = new Map<string, CachedAccessToken>();
  readonly #refreshing = new Map<string, Promise<string>>();

  constructor(
    private readonly options: SpotifyOAuthOptions,
    private readonly connections: SpotifyConnectionRepository,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  status(guildId: string): SpotifyConnectionStatus {
    return this.connections.status(guildId);
  }

  isConnected(guildId: string): boolean {
    return this.status(guildId).connected;
  }

  createAuthorizationUrl(guildId: string, notificationChannelId: string | null = null): string {
    this.pruneTickets();
    const state = randomBytes(32).toString('base64url');
    this.#tickets.set(state, {
      guildId,
      notificationChannelId,
      expiresAt: Date.now() + 10 * 60_000,
    });
    const parameters = new URLSearchParams({
      client_id: this.options.clientId,
      response_type: 'code',
      redirect_uri: this.options.redirectUri,
      scope: 'playlist-read-private playlist-read-collaborative',
      state,
      show_dialog: 'true',
    });
    return `https://accounts.spotify.com/authorize?${parameters.toString()}`;
  }

  async completeAuthorization(code: string, state: string): Promise<CompletedSpotifyAuthorization> {
    const ticket = this.#tickets.get(state);
    this.#tickets.delete(state);
    if (!ticket || ticket.expiresAt <= Date.now()) {
      throw new LucioError('NOT_AUTHORIZED', 'El enlace de configuración ha caducado.', 403);
    }
    const token = await this.requestToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.options.redirectUri,
      }),
    );
    if (!token.refresh_token) {
      throw new LucioError(
        'SOURCE_UNAVAILABLE',
        'Spotify no entregó autorización persistente. Ejecuta `/setup` de nuevo.',
        502,
      );
    }
    this.connections.set(ticket.guildId, token.refresh_token);
    this.#accessTokens.set(ticket.guildId, {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1_000,
    });
    return {
      guildId: ticket.guildId,
      notificationChannelId: ticket.notificationChannelId,
    };
  }

  disconnect(guildId: string): boolean {
    this.#accessTokens.delete(guildId);
    this.#refreshing.delete(guildId);
    return this.connections.delete(guildId);
  }

  async getAccessToken(guildId: string): Promise<string> {
    const cached = this.#accessTokens.get(guildId);
    if (cached && cached.expiresAt > Date.now() + 30_000) return cached.value;
    const activeRefresh = this.#refreshing.get(guildId);
    if (activeRefresh) return activeRefresh;
    const refresh = this.refreshAccessToken(guildId).finally(() =>
      this.#refreshing.delete(guildId),
    );
    this.#refreshing.set(guildId, refresh);
    return refresh;
  }

  private async refreshAccessToken(guildId: string): Promise<string> {
    let connection: ReturnType<SpotifyConnectionRepository['get']>;
    try {
      connection = this.connections.get(guildId);
    } catch {
      this.disconnect(guildId);
      throw new LucioError(
        'SPOTIFY_NOT_CONFIGURED',
        'La autorización guardada ya no es válida. Un administrador debe ejecutar `/setup`.',
        409,
      );
    }
    if (!connection) {
      throw new LucioError(
        'SPOTIFY_NOT_CONFIGURED',
        'Spotify no está vinculado en este servidor. Un administrador debe ejecutar `/setup`.',
        409,
      );
    }
    let token: SpotifyTokenResponse;
    try {
      token = await this.requestToken(
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: connection.refreshToken,
        }),
      );
    } catch (error) {
      if (error instanceof LucioError && error.statusCode === 401) this.disconnect(guildId);
      throw error;
    }
    if (token.refresh_token) this.connections.set(guildId, token.refresh_token);
    this.#accessTokens.set(guildId, {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1_000,
    });
    return token.access_token;
  }

  private async requestToken(body: URLSearchParams): Promise<SpotifyTokenResponse> {
    const response = await this.fetcher('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const statusCode = response.status === 400 || response.status === 401 ? 401 : 502;
      throw new LucioError(
        statusCode === 401 ? 'SPOTIFY_NOT_CONFIGURED' : 'SOURCE_UNAVAILABLE',
        statusCode === 401
          ? 'La autorización de Spotify ha caducado. Un administrador debe ejecutar `/setup`.'
          : 'Spotify no está disponible.',
        statusCode,
      );
    }
    return (await response.json()) as SpotifyTokenResponse;
  }

  private pruneTickets(): void {
    const now = Date.now();
    for (const [state, ticket] of this.#tickets) {
      if (ticket.expiresAt <= now) this.#tickets.delete(state);
    }
  }
}
