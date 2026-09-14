import { ulid } from 'ulid';
import { LIMITS, type QueueItem, type Track } from '../../shared/index.js';
import { LucioError } from './errors.js';

export class TrackQueue {
  readonly #items: QueueItem[] = [];

  get size(): number {
    return this.#items.length;
  }

  peek(): QueueItem | null {
    return this.#items[0] ?? null;
  }

  snapshot(): QueueItem[] {
    return this.#items.map((item) => ({ ...item }));
  }

  enqueue(tracks: Track[]): QueueItem[] {
    if (this.size + tracks.length > LIMITS.maxQueueSize) {
      throw new LucioError(
        'QUEUE_FULL',
        `La cola admite un máximo de ${LIMITS.maxQueueSize} pistas.`,
      );
    }

    const now = new Date().toISOString();
    const items = tracks.map((track) => ({ ...track, id: track.id || ulid(), enqueuedAt: now }));
    this.#items.push(...items);
    return items;
  }

  prepend(item: QueueItem): void {
    this.#items.unshift(item);
  }

  dequeue(): QueueItem | null {
    return this.#items.shift() ?? null;
  }

  remove(position: number): QueueItem {
    const index = position - 1;
    if (index < 0 || index >= this.#items.length) {
      throw new LucioError('INVALID_POSITION', 'La posición indicada no existe.');
    }
    return this.#items.splice(index, 1)[0]!;
  }

  move(from: number, to: number): void {
    if (from < 1 || from > this.size || to < 1 || to > this.size) {
      throw new LucioError('INVALID_POSITION', 'La posición indicada no existe.');
    }
    const [item] = this.#items.splice(from - 1, 1);
    this.#items.splice(to - 1, 0, item!);
  }

  clear(): void {
    this.#items.length = 0;
  }

  shuffle(random = Math.random): void {
    for (let index = this.#items.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [this.#items[index], this.#items[other]] = [this.#items[other]!, this.#items[index]!];
    }
  }
}
