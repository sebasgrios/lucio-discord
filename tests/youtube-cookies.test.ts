import { access, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/server/config.js';
import { prepareYouTubeCookies } from '../src/server/sources/youtube-cookies.js';

const cookieFile = [
  '# Netscape HTTP Cookie File',
  '.youtube.com\tTRUE\t/\tTRUE\t2147483647\tVISITOR_INFO1_LIVE\ttest-value',
  '',
].join('\n');

describe('prepareYouTubeCookies', () => {
  it('trata las variables opcionales vacías como no configuradas', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      YTDLP_COOKIES_PATH: '',
      YOUTUBE_COOKIES_BASE64: '',
    });

    const prepared = await prepareYouTubeCookies(config);
    expect(prepared.path).toBeUndefined();
  });

  it('materializa las cookies codificadas y elimina el archivo al cerrar', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      YOUTUBE_COOKIES_BASE64: Buffer.from(cookieFile).toString('base64'),
    });
    const prepared = await prepareYouTubeCookies(config);

    expect(prepared.path).toBeDefined();
    expect(await readFile(prepared.path!, 'utf8')).toBe(cookieFile);

    await prepared.dispose();
    await expect(access(prepared.path!)).rejects.toThrow();
  });

  it('rechaza contenido que no sea un archivo Netscape de YouTube', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      YOUTUBE_COOKIES_BASE64: Buffer.from('not a cookie file').toString('base64'),
    });

    await expect(prepareYouTubeCookies(config)).rejects.toThrow('formato Netscape');
  });
});
