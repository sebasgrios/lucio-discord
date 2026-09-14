import { describe, expect, it, vi } from 'vitest';
import { openDirectMediaStream } from '../src/server/audio/direct-media-stream.js';
import type { PlaybackTicket } from '../src/server/sources/playback-ticket-store.js';

const ticket: PlaybackTicket = {
  mediaUrl: 'https://rr1.googlevideo.com/videoplayback?expire=4102444800',
  headers: { 'user-agent': 'Lucio' },
  ext: 'webm',
  codec: 'opus',
  expiresAt: 4_102_444_800_000,
};

describe('openDirectMediaStream', () => {
  it('abre el medio sin seguir redirecciones y conserva las cabeceras permitidas', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]))));
    const controller = new AbortController();

    const stream = await openDirectMediaStream(ticket, controller.signal, fetcher);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array));

    expect(Buffer.concat(chunks)).toEqual(Buffer.from([1, 2, 3]));
    expect(fetcher).toHaveBeenCalledWith(
      ticket.mediaUrl,
      expect.objectContaining({
        headers: ticket.headers,
        redirect: 'error',
        signal: controller.signal,
      }),
    );
  });

  it('rechaza respuestas no reproducibles', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 403 })));
    await expect(
      openDirectMediaStream(ticket, new AbortController().signal, fetcher),
    ).rejects.toThrow('estado 403');
  });
});
