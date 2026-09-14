import { describe, expect, it } from 'vitest';
import { YTDLP_AUDIO_FORMAT } from '../src/server/sources/ytdlp-options.js';

describe('YTDLP_AUDIO_FORMAT', () => {
  it('prioriza audio independiente y acepta un formato combinado como respaldo', () => {
    expect(YTDLP_AUDIO_FORMAT).toBe('bestaudio[ext=webm][acodec^=opus]/bestaudio/best');
  });
});
