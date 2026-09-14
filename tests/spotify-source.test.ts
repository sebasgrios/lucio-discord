import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpotifySource, parseSpotifyResource } from '../src/server/sources/spotify-source.js';
import { track } from './helpers.js';

afterEach(() => vi.unstubAllGlobals());

describe('parseSpotifyResource', () => {
  it('reconoce una pista sin prefijo regional', () => {
    expect(
      parseSpotifyResource(new URL('https://open.spotify.com/track/example?si=value')),
    ).toEqual({ kind: 'track', id: 'example' });
  });

  it('reconoce una pista con prefijo regional', () => {
    expect(
      parseSpotifyResource(new URL('https://open.spotify.com/intl-es/track/example?si=value')),
    ).toEqual({ kind: 'track', id: 'example' });
  });

  it('distingue una playlist de una pista', () => {
    expect(parseSpotifyResource(new URL('https://open.spotify.com/playlist/example'))).toEqual({
      kind: 'playlist',
      id: 'example',
    });
  });

  it('devuelve la primera pista de un álbum antes de resolver el resto', async () => {
    const responses = [
      { ok: true, json: () => Promise.resolve({ access_token: 'token', expires_in: 3600 }) },
      {
        ok: true,
        json: () =>
          Promise.resolve({
            tracks: {
              items: ['A', 'B', 'C'].map((name) => ({
                name,
                duration_ms: 180_000,
                artists: [{ name: 'Artist' }],
              })),
            },
          }),
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(responses.shift())),
    );
    const searchCandidates = vi.fn((input: string, requestedBy: string) =>
      Promise.resolve([
        track({
          title: input,
          artist: 'Artist',
          requestedBy,
          durationMs: 180_000,
        }),
      ]),
    );
    const source = new SpotifySource('client', 'secret', { searchCandidates } as never);

    const result = await source.resolveProgressively({
      guildId: 'guild',
      input: 'https://open.spotify.com/album/example',
      requestedBy: 'user',
      limit: 100,
    });

    expect(result.initial).toHaveLength(1);
    expect(result.expectedCount).toBe(3);
    expect(searchCandidates).toHaveBeenCalledOnce();
    expect(result.remaining).not.toBeNull();
    await expect(result.remaining!()).resolves.toHaveLength(2);
    expect(searchCandidates).toHaveBeenCalledTimes(3);
  });

  it('rechaza una playlist si el servidor no ha vinculado Spotify', async () => {
    const source = new SpotifySource('client', 'secret', {
      searchCandidates: vi.fn(),
    } as never);

    await expect(
      source.resolveProgressively({
        guildId: 'guild',
        input: 'https://open.spotify.com/playlist/example',
        requestedBy: 'user',
        limit: 100,
      }),
    ).rejects.toMatchObject({ code: 'SPOTIFY_NOT_CONFIGURED' });
  });

  it('importa una playlist propia o colaborativa usando el token del servidor', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            items: ['A', 'B'].map((name) => ({
              item: {
                type: 'track',
                name,
                duration_ms: 180_000,
                artists: [{ name: 'Artist' }],
              },
            })),
            total: 2,
            next: null,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    const searchCandidates = vi.fn((input: string, requestedBy: string) =>
      Promise.resolve([
        track({ title: input, artist: 'Artist', requestedBy, durationMs: 180_000 }),
      ]),
    );
    const tokens = {
      isConnected: (guildId: string) => guildId === 'guild',
      getAccessToken: vi.fn(() => Promise.resolve('user-token')),
    };
    const source = new SpotifySource(
      'client',
      'secret',
      { searchCandidates } as never,
      tokens,
      fetcher,
    );

    const result = await source.resolveProgressively({
      guildId: 'guild',
      input: 'https://open.spotify.com/playlist/example',
      requestedBy: 'user',
      limit: 100,
    });

    expect(result.initial).toHaveLength(1);
    expect(result.expectedCount).toBe(2);
    await expect(result.remaining!()).resolves.toHaveLength(1);
    expect(tokens.getAccessToken).toHaveBeenCalledWith('guild');
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining('/v1/playlists/example/items?'),
      expect.objectContaining({ headers: { Authorization: 'Bearer user-token' } }),
    );
  });

  it('explica el límite de Spotify cuando la cuenta no posee la playlist', async () => {
    const source = new SpotifySource(
      'client',
      'secret',
      { searchCandidates: vi.fn() } as never,
      { isConnected: () => true, getAccessToken: () => Promise.resolve('user-token') },
      () => Promise.resolve(new Response(null, { status: 403 })),
    );

    await expect(
      source.resolveProgressively({
        guildId: 'guild',
        input: 'https://open.spotify.com/playlist/example',
        requestedBy: 'user',
        limit: 100,
      }),
    ).rejects.toMatchObject({ code: 'SPOTIFY_PLAYLIST_FORBIDDEN' });
  });
});
