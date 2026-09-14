import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { PlaybackTicket } from '../sources/playback-ticket-store.js';

export async function openDirectMediaStream(
  ticket: PlaybackTicket,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Readable> {
  const response = await fetcher(ticket.mediaUrl, {
    headers: ticket.headers,
    redirect: 'error',
    signal,
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    throw new Error(`La CDN de audio respondió con estado ${response.status}.`);
  }
  return Readable.fromWeb(response.body as NodeReadableStream<Uint8Array>);
}
