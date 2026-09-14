import { describe, expect, it } from 'vitest';
import { parseSupportedUrl } from '../src/server/sources/url-policy.js';

describe('source URL policy', () => {
  it('acepta búsquedas y proveedores conocidos', () => {
    expect(parseSupportedUrl('daft punk around the world')).toBeNull();
    expect(parseSupportedUrl('https://youtu.be/example')?.hostname).toBe('youtu.be');
    expect(parseSupportedUrl('https://open.spotify.com/track/example')?.hostname).toBe(
      'open.spotify.com',
    );
  });

  it('rechaza protocolos, IPs y hosts desconocidos', () => {
    expect(() => parseSupportedUrl('http://youtube.com/watch?v=x')).toThrow(/HTTPS/);
    expect(() => parseSupportedUrl('https://127.0.0.1/file')).toThrow(/no está permitido/);
    expect(() => parseSupportedUrl('https://example.com/file')).toThrow(/no está permitido/);
  });
});
