import { LucioError } from '../domain/errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  readonly #buckets = new Map<string, Bucket>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()): void {
    const bucket = this.#buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.#buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (bucket.count >= limit) {
      throw new LucioError(
        'RATE_LIMITED',
        'Has realizado demasiadas acciones. Inténtalo más tarde.',
        429,
      );
    }
    bucket.count += 1;
  }

  prune(now = Date.now()): void {
    for (const [key, bucket] of this.#buckets) {
      if (bucket.resetAt <= now) this.#buckets.delete(key);
    }
  }
}
