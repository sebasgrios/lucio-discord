import { describe, expect, it } from 'vitest';
import { FixedWindowRateLimiter } from '../src/server/services/rate-limiter.js';

describe('FixedWindowRateLimiter', () => {
  it('bloquea al superar el límite y reinicia la ventana', () => {
    const limiter = new FixedWindowRateLimiter();
    limiter.consume('user', 2, 1_000, 0);
    limiter.consume('user', 2, 1_000, 10);
    expect(() => limiter.consume('user', 2, 1_000, 20)).toThrow(/demasiadas/);
    expect(() => limiter.consume('user', 2, 1_000, 1_001)).not.toThrow();
  });
});
