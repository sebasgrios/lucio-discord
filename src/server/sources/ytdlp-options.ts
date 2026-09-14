export interface YtDlpRuntimeOptions {
  cookiesPath?: string | undefined;
  cacheDir?: string | undefined;
}

export const YTDLP_AUDIO_FORMAT = 'bestaudio[ext=webm][acodec^=opus]/bestaudio/best';

export function withYtDlpRuntime(
  args: readonly string[],
  options: YtDlpRuntimeOptions = {},
): string[] {
  const authentication = options.cookiesPath ? ['--cookies', options.cookiesPath] : [];
  const cache = options.cacheDir ? ['--cache-dir', options.cacheDir] : [];
  return ['--no-config', '--js-runtimes', 'node', ...cache, ...authentication, ...args];
}
