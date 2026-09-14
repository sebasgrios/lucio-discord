import { isIP } from 'node:net';
import { LucioError } from '../domain/errors.js';

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'spotify.com',
  'open.spotify.com',
]);

export function parseSupportedUrl(input: string): URL | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') {
    throw new LucioError('UNSUPPORTED_INPUT', 'Solo se admiten enlaces HTTPS.');
  }
  const hostname = url.hostname.toLowerCase();
  if (isIP(hostname) !== 0 || !ALLOWED_HOSTS.has(hostname)) {
    throw new LucioError('UNSUPPORTED_INPUT', 'El proveedor del enlace no está permitido.');
  }
  return url;
}

export function isYouTubeUrl(url: URL): boolean {
  return url.hostname.endsWith('youtube.com') || url.hostname === 'youtu.be';
}

export function isSpotifyUrl(url: URL): boolean {
  return url.hostname === 'open.spotify.com' || url.hostname === 'spotify.com';
}
