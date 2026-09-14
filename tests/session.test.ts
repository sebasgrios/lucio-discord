import { describe, expect, it, vi } from 'vitest';
import type { SourceAdapter } from '../src/shared/index.js';
import { MusicSession } from '../src/server/domain/session.js';
import { createLogger } from '../src/server/logger.js';
import { FakeAudioPipeline, track } from './helpers.js';

const autoplaySource: SourceAdapter = {
  name: 'fake',
  supports: () => true,
  resolve: () => Promise.resolve([]),
  related: () => Promise.resolve(track({ title: 'Related', sourceId: 'related' })),
};

function createSession(listeners = 3) {
  const pipeline = new FakeAudioPipeline();
  const onTerminate = vi.fn();
  const session = new MusicSession({
    guildId: 'guild',
    voiceChannelId: 'voice',
    textChannelId: 'text',
    pipeline,
    autoplaySource,
    logger: createLogger({ LOG_LEVEL: 'fatal' } as never),
    getListenerCount: () => listeners,
    onTerminate,
  });
  return { session, pipeline, onTerminate };
}

describe('MusicSession', () => {
  it('inicia la primera pista y avanza al terminar', async () => {
    const { session, pipeline } = createSession();
    await session.add([track({ title: 'A' }), track({ title: 'B' })]);
    expect(session.current?.title).toBe('A');
    expect(pipeline.prepared.map((item) => item.title)).toEqual(['B']);
    pipeline.finish();
    await vi.waitFor(() => expect(session.current?.title).toBe('B'));
  });

  it('requiere mayoría de votos y permite al solicitante saltar', async () => {
    const { session } = createSession(3);
    await session.add([track({ title: 'A' }), track({ title: 'B' })]);
    expect(await session.voteSkip('listener-1', false)).toEqual({
      skipped: false,
      votes: 1,
      required: 2,
    });
    expect((await session.voteSkip('listener-2', false)).skipped).toBe(true);
    await vi.waitFor(() => expect(session.current?.title).toBe('B'));
  });

  it('usa autoplay solo cuando está activado y la cola termina', async () => {
    const { session, pipeline } = createSession();
    session.setAutoplay(true);
    await session.add([track({ title: 'A', sourceId: 'a' })]);
    pipeline.finish();
    await vi.waitFor(() => expect(session.current?.title).toBe('Related'));
  });

  it('destruye el audio al terminar la sesión', () => {
    const { session, pipeline, onTerminate } = createSession();
    session.terminate();
    expect(pipeline.destroyed).toBe(true);
    expect(onTerminate).toHaveBeenCalledOnce();
  });

  it('omite una pista que no puede arrancar y continúa la cola', async () => {
    class FailOncePipeline extends FakeAudioPipeline {
      failed = false;
      override play(...parameters: Parameters<FakeAudioPipeline['play']>) {
        if (!this.failed) {
          this.failed = true;
          return Promise.reject(new Error('source failed'));
        }
        return super.play(...parameters);
      }
    }
    const pipeline = new FailOncePipeline();
    const session = new MusicSession({
      guildId: 'guild',
      voiceChannelId: 'voice',
      textChannelId: 'text',
      pipeline,
      autoplaySource,
      logger: createLogger({ LOG_LEVEL: 'fatal' } as never),
      getListenerCount: () => 1,
      onTerminate: vi.fn(),
    });
    await session.add([track({ title: 'Broken' }), track({ title: 'Working' })]);
    await vi.waitFor(() => expect(session.current?.title).toBe('Working'));
    expect(pipeline.current?.title).toBe('Working');
  });

  it('añade importaciones en segundo plano y las cancela al parar', async () => {
    const { session } = createSession();
    let resolveTracks!: (tracks: ReturnType<typeof track>[]) => void;
    const remaining = new Promise<ReturnType<typeof track>[]>((resolve) => {
      resolveTracks = resolve;
    });

    await session.add([track({ title: 'A' })]);
    session.addDeferred(remaining);
    session.stop();
    resolveTracks([track({ title: 'B' })]);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(session.current).toBeNull();
    expect(session.snapshot().queue).toHaveLength(0);
  });
});
