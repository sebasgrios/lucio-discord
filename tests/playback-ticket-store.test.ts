import { describe, expect, it } from 'vitest';
import { PlaybackTicketStore } from '../src/server/sources/playback-ticket-store.js';

describe('PlaybackTicketStore', () => {
  it('conserva únicamente URLs HTTPS de la CDN de YouTube y cabeceras seguras', () => {
    const store = new PlaybackTicketStore();
    expect(
      store.set('track', {
        url: 'https://rr1.googlevideo.com/videoplayback?expire=4102444800',
        ext: 'webm',
        acodec: 'opus',
        http_headers: {
          'User-Agent': 'Lucio',
          Cookie: 'secret',
          Authorization: 'secret',
        },
      }),
    ).toBe(true);
    expect(store.get('track')).toMatchObject({
      ext: 'webm',
      codec: 'opus',
      headers: { 'user-agent': 'Lucio' },
    });
    expect(store.get('track')?.headers).not.toHaveProperty('cookie');
    expect(store.get('track')?.headers).not.toHaveProperty('authorization');
  });

  it('rechaza hosts externos y descarta tickets caducados', () => {
    const store = new PlaybackTicketStore();
    expect(store.set('external', { url: 'https://example.com/audio.webm' })).toBe(false);
    expect(
      store.set('expired', {
        url: 'https://rr1.googlevideo.com/videoplayback?expire=1',
      }),
    ).toBe(true);
    expect(store.get('expired')).toBeNull();
    expect(
      store.set('manifest', {
        url: 'https://manifest.googlevideo.com/api/manifest/hls_playlist/example',
      }),
    ).toBe(false);
  });
});
