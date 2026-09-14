import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpotifyConnectionRepository } from '../src/server/persistence/spotify-connection-repository.js';
import { TokenCipher } from '../src/server/persistence/token-cipher.js';
import { SpotifyOAuthService } from '../src/server/services/spotify-oauth-service.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('Spotify connections', () => {
  it('cifra el refresh token persistido', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lucio-spotify-test-'));
    directories.push(directory);
    const repository = new SpotifyConnectionRepository(
      join(directory, 'spotify.db'),
      new TokenCipher('a-secure-test-secret-with-32-characters'),
    );

    repository.set('guild', 'refresh-secret');

    expect(repository.status('guild').connected).toBe(true);
    expect(repository.get('guild')?.refreshToken).toBe('refresh-secret');
    repository.close();
  });

  it('completa OAuth una sola vez y conserva la autorización del servidor', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'lucio-spotify-oauth-test-'));
    directories.push(directory);
    const repository = new SpotifyConnectionRepository(
      join(directory, 'spotify.db'),
      new TokenCipher('a-secure-test-secret-with-32-characters'),
    );
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const service = new SpotifyOAuthService(
      {
        clientId: 'client',
        clientSecret: 'secret',
        redirectUri: 'https://lucio.example/auth/spotify/callback',
      },
      repository,
      fetcher,
    );
    const authorizationUrl = new URL(service.createAuthorizationUrl('guild', 'setup-channel'));
    const state = authorizationUrl.searchParams.get('state')!;

    await expect(service.completeAuthorization('code', state)).resolves.toEqual({
      guildId: 'guild',
      notificationChannelId: 'setup-channel',
    });
    expect(service.isConnected('guild')).toBe(true);
    await expect(service.getAccessToken('guild')).resolves.toBe('access-token');
    await expect(service.completeAuthorization('code', state)).rejects.toMatchObject({
      code: 'NOT_AUTHORIZED',
    });
    expect(fetcher).toHaveBeenCalledOnce();
    repository.close();
  });
});
