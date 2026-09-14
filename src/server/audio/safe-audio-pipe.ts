import type { Readable, Writable } from 'node:stream';

export class SafeAudioPipe {
  #closing = false;

  constructor(
    private readonly source: Readable,
    private readonly destination: Writable,
    private readonly onError: (error: Error) => void,
  ) {
    this.destination.on('error', this.handleDestinationError);
    this.source.pipe(this.destination);
  }

  close(): void {
    if (this.#closing) return;
    this.#closing = true;
    this.source.unpipe(this.destination);
    this.destination.destroy();
  }

  private readonly handleDestinationError = (error: Error): void => {
    if (this.#closing && (error as NodeJS.ErrnoException).code === 'EPIPE') return;
    this.onError(error);
  };
}
