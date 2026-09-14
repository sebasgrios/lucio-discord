import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import type { ProcessRunner, RunResult } from '../src/server/sources/process-runner.js';
import { YtDlpSource } from '../src/server/sources/ytdlp-source.js';

class FakeRunner implements ProcessRunner {
  args: string[] = [];
  runs = 0;
  run(_command: string, args: string[]): Promise<RunResult> {
    this.runs += 1;
    this.args = args;
    return Promise.resolve({
      exitCode: 0,
      stderr: '',
      stdout: JSON.stringify({
        entries: [
          {
            id: 'one',
            title: 'One',
            uploader: 'Artist',
            duration: 120,
            ext: 'webm',
            acodec: 'opus',
            url: 'https://rr1.googlevideo.com/videoplayback?expire=4102444800',
          },
          { id: 'two', title: 'Two', uploader: 'Artist', duration: 130 },
        ],
      }),
    });
  }
  spawn(): ChildProcessWithoutNullStreams {
    throw new Error('not used');
  }
}

describe('YtDlpSource', () => {
  it('devuelve una única coincidencia para una búsqueda normal', async () => {
    const runner = new FakeRunner();
    const source = new YtDlpSource(runner, 'yt-dlp');
    const tracks = await source.resolve({
      guildId: 'guild',
      input: 'artist title',
      requestedBy: 'user',
      limit: 100,
    });
    expect(runner.args).toContain('ytsearch1:artist title');
    expect(runner.args).toEqual(expect.arrayContaining(['--no-config', '--js-runtimes', 'node']));
    expect(runner.args).toEqual(
      expect.arrayContaining(['-f', 'bestaudio[ext=webm][acodec^=opus]/bestaudio/best']),
    );
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.title).toBe('One');
    expect(tracks[0]?.audioFormat).toEqual({ ext: 'webm', codec: 'opus' });
    expect(source.playbackTickets.get(tracks[0]!.id)?.mediaUrl).toContain('googlevideo.com');
  });

  it('permite varios candidatos para emparejar Spotify', async () => {
    const runner = new FakeRunner();
    const source = new YtDlpSource(runner, 'yt-dlp');
    expect(await source.searchCandidates('artist title', 'user', 5)).toHaveLength(2);
    expect(runner.args).toContain('ytsearch5:artist title');
    expect(runner.args).toContain('--flat-playlist');
    expect(runner.args).toEqual(expect.arrayContaining(['--no-config', '--js-runtimes', 'node']));
  });

  it('pasa el archivo de cookies a todas las solicitudes de YouTube', async () => {
    const runner = new FakeRunner();
    const source = new YtDlpSource(runner, 'yt-dlp', { cookiesPath: '/run/youtube-cookies.txt' });
    await source.resolve({
      guildId: 'guild',
      input: 'artist title',
      requestedBy: 'user',
      limit: 1,
    });
    expect(runner.args).toEqual(expect.arrayContaining(['--cookies', '/run/youtube-cookies.txt']));
  });

  it('reutiliza metadatos recientes sin conservar el solicitante', async () => {
    const runner = new FakeRunner();
    const source = new YtDlpSource(runner, 'yt-dlp');
    const first = await source.resolve({
      guildId: 'guild',
      input: 'artist title',
      requestedBy: 'one',
      limit: 1,
    });
    const second = await source.resolve({
      guildId: 'guild',
      input: 'artist title',
      requestedBy: 'two',
      limit: 1,
    });

    expect(runner.runs).toBe(1);
    expect(second[0]?.requestedBy).toBe('two');
    expect(second[0]?.id).not.toBe(first[0]?.id);
    expect(source.playbackTickets.get(second[0]!.id)).not.toBeNull();
  });
});
