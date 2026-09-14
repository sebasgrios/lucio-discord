import { constants } from 'node:fs';
import { access, chmod, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AppConfig } from '../config.js';

interface PreparedCookies {
  path?: string;
  dispose(): Promise<void>;
}

export async function prepareYouTubeCookies(config: AppConfig): Promise<PreparedCookies> {
  if (config.YTDLP_COOKIES_PATH) {
    await access(config.YTDLP_COOKIES_PATH, constants.R_OK);
    return { path: config.YTDLP_COOKIES_PATH, dispose: () => Promise.resolve() };
  }

  if (!config.YOUTUBE_COOKIES_BASE64) {
    return { dispose: () => Promise.resolve() };
  }

  const contents = decodeCookieFile(config.YOUTUBE_COOKIES_BASE64);
  const path = join(tmpdir(), `lucio-youtube-cookies-${process.pid}.txt`);
  await writeFile(path, contents, { encoding: 'utf8', mode: 0o600 });
  await chmod(path, 0o600);
  return {
    path,
    dispose: async () => {
      await rm(path, { force: true });
    },
  };
}

function decodeCookieFile(encoded: string): string {
  const compact = encoded.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    throw new Error('YOUTUBE_COOKIES_BASE64 no contiene Base64 válido.');
  }
  const decoded = Buffer.from(compact, 'base64');
  if (decoded.byteLength === 0 || decoded.byteLength > 2_000_000) {
    throw new Error('El archivo de cookies de YouTube está vacío o supera el límite permitido.');
  }
  const contents = decoded.toString('utf8');
  if (
    !contents.startsWith('# Netscape HTTP Cookie File') ||
    (!contents.includes('.youtube.com') && !contents.includes('\tyoutube.com\t'))
  ) {
    throw new Error('Las cookies deben estar en formato Netscape e incluir youtube.com.');
  }
  return contents;
}
