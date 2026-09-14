import { describe, expect, it, vi } from 'vitest';
import { DiscordPanelPresenter } from '../src/server/discord/presenter.js';
import { MusicSession } from '../src/server/domain/session.js';
import { createLogger } from '../src/server/logger.js';
import { FakeAudioPipeline, track } from './helpers.js';

describe('DiscordPanelPresenter', () => {
  it('crea un solo panel aunque la sesión cambie mientras se publica', async () => {
    const message = {
      id: 'panel-1',
      edit: vi.fn(() => Promise.resolve()),
      delete: vi.fn(() => Promise.resolve()),
    };
    let publishedMessage: typeof message | null = null;
    const channel = {
      isTextBased: () => true,
      isDMBased: () => false,
      messages: { fetch: vi.fn(() => Promise.resolve(publishedMessage)) },
      send: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        publishedMessage = message;
        return message;
      }),
    };
    const client = { channels: { fetch: vi.fn(() => Promise.resolve(channel)) } };
    const settings = { get: () => ({ locale: 'es' as const }) };
    const session = new MusicSession({
      guildId: 'guild',
      voiceChannelId: 'voice',
      textChannelId: 'text',
      pipeline: new FakeAudioPipeline(),
      autoplaySource: { name: 'fake', supports: () => true, resolve: () => Promise.resolve([]) },
      logger: createLogger({ LOG_LEVEL: 'fatal' } as never),
      getListenerCount: () => 1,
      onTerminate: vi.fn(),
    });
    const presenter = new DiscordPanelPresenter(
      client as never,
      settings as never,
      sessionLogger(),
    );

    presenter.attach(session);
    await session.add([track()]);

    await vi.waitFor(() => expect(session.snapshot().panelMessageId).toBe('panel-1'));
    await vi.waitFor(() => expect(message.edit).toHaveBeenCalled());
    expect(channel.send).toHaveBeenCalledOnce();
    session.terminate();
  });

  it('publica la primera pista directamente y reemplaza el panel al avanzar', async () => {
    const published = new Map<string, ReturnType<typeof createMessage>>();
    let messageSequence = 0;
    const channel = {
      isTextBased: () => true,
      isDMBased: () => false,
      messages: {
        fetch: vi.fn((id: string) => Promise.resolve(published.get(id) ?? null)),
      },
      send: vi.fn((payload: unknown) => {
        const id = `panel-${++messageSequence}`;
        const message = createMessage(id, () => published.delete(id));
        published.set(id, message);
        return Promise.resolve({ ...message, payload });
      }),
    };
    const pipeline = new FakeAudioPipeline();
    const session = new MusicSession({
      guildId: 'guild',
      voiceChannelId: 'voice',
      textChannelId: 'text',
      pipeline,
      autoplaySource: { name: 'fake', supports: () => true, resolve: () => Promise.resolve([]) },
      logger: sessionLogger(),
      getListenerCount: () => 1,
      onTerminate: vi.fn(),
    });
    await session.add([track({ title: 'First' }), track({ title: 'Second' })]);
    const presenter = new DiscordPanelPresenter(
      { channels: { fetch: vi.fn(() => Promise.resolve(channel)) } } as never,
      { get: () => ({ locale: 'es' as const }) } as never,
      sessionLogger(),
    );

    presenter.attach(session);
    await vi.waitFor(() => expect(session.snapshot().panelMessageId).toBe('panel-1'));
    const firstPayload = channel.send.mock.calls[0]?.[0] as {
      embeds: Array<{ data: { title?: string } }>;
    };
    expect(firstPayload.embeds[0]?.data.title).toBe('First');

    pipeline.finish();
    await vi.waitFor(() => expect(channel.send).toHaveBeenCalledTimes(2));
    expect(published.has('panel-1')).toBe(false);
    expect(session.snapshot().panelMessageId).toBe('panel-2');
    session.terminate();
  });
});

function sessionLogger() {
  return createLogger({ LOG_LEVEL: 'fatal' } as never);
}

function createMessage(id: string, onDelete: () => void) {
  return {
    id,
    edit: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => {
      onDelete();
      return Promise.resolve();
    }),
  };
}
