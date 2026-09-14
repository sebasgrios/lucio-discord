import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { SafeAudioPipe } from '../src/server/audio/safe-audio-pipe.js';

describe('SafeAudioPipe', () => {
  it('absorbe un EPIPE tardío durante el cierre esperado', () => {
    const source = new PassThrough();
    const destination = new PassThrough();
    const onError = vi.fn();
    const pipe = new SafeAudioPipe(source, destination, onError);

    pipe.close();
    destination.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }));

    expect(destination.destroyed).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it('propaga los errores mientras la tubería sigue activa', () => {
    const source = new PassThrough();
    const destination = new PassThrough();
    const onError = vi.fn();
    const pipe = new SafeAudioPipe(source, destination, onError);
    const error = new Error('fallo de escritura');

    destination.emit('error', error);

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(error);
    pipe.close();
  });
});
