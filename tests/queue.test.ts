import { describe, expect, it } from 'vitest';
import { TrackQueue } from '../src/server/domain/queue.js';
import { track } from './helpers.js';

describe('TrackQueue', () => {
  it('preserva FIFO y permite mover y eliminar posiciones humanas', () => {
    const queue = new TrackQueue();
    queue.enqueue([track({ title: 'A' }), track({ title: 'B' }), track({ title: 'C' })]);
    queue.move(3, 1);
    expect(queue.snapshot().map((item) => item.title)).toEqual(['C', 'A', 'B']);
    expect(queue.remove(2).title).toBe('A');
    expect(queue.dequeue()?.title).toBe('C');
  });

  it('mezcla sin perder elementos', () => {
    const queue = new TrackQueue();
    queue.enqueue([track({ title: 'A' }), track({ title: 'B' }), track({ title: 'C' })]);
    queue.shuffle(() => 0);
    expect(
      queue
        .snapshot()
        .map((item) => item.title)
        .sort(),
    ).toEqual(['A', 'B', 'C']);
  });
});
