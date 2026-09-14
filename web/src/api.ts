import type { GuildSettings, PlayerAction, SessionSnapshot } from '../../src/shared/types';

export interface GuildSummary {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  botInstalled: boolean;
}

export interface CurrentUser {
  userId: string;
  displayName: string;
  avatar: string | null;
  guilds: GuildSummary[];
  onboardingCompleted: boolean;
}

export interface GuildOptions {
  channels: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
}

export interface SpotifyStatus {
  available: boolean;
  connected: boolean;
  connectedAt: string | null;
  updatedAt?: string | null;
  authorizationUrl: string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const payload = (await response
      .json()
      .catch(() => ({ error: 'HTTP_ERROR', message: response.statusText }))) as {
      error: string;
      message: string;
    };
    throw new ApiError(payload.error, payload.message);
  }
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<CurrentUser>('/api/me'),
  player: (guildId: string) =>
    request<{ snapshot: SessionSnapshot | null }>(`/api/guilds/${guildId}/player`),
  play: (guildId: string, input: string) =>
    request<{ added: number; resolving: number; snapshot: SessionSnapshot }>(
      `/api/guilds/${guildId}/player/play`,
      {
        method: 'POST',
        body: JSON.stringify({ input }),
      },
    ),
  action: (guildId: string, action: PlayerAction) =>
    request<{ snapshot: SessionSnapshot | null }>(`/api/guilds/${guildId}/player/action`, {
      method: 'POST',
      body: JSON.stringify(action),
    }),
  settings: (guildId: string) => request<GuildSettings>(`/api/guilds/${guildId}/settings`),
  options: (guildId: string) => request<GuildOptions>(`/api/guilds/${guildId}/options`),
  spotify: (guildId: string) => request<SpotifyStatus>(`/api/guilds/${guildId}/spotify`),
  disconnectSpotify: (guildId: string) =>
    request<{ connected: false }>(`/api/guilds/${guildId}/spotify`, { method: 'DELETE' }),
  updateSettings: (guildId: string, patch: Partial<GuildSettings>) =>
    request<GuildSettings>(`/api/guilds/${guildId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  completeOnboarding: () => request<{ completed: true }>('/api/me/onboarding', { method: 'POST' }),
};
