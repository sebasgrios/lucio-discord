import { createHash } from 'node:crypto';
import pino from 'pino';
import type { AppConfig } from './config.js';

export function createLogger(config: AppConfig) {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        'token',
        '*.token',
        'authorization',
        'req.headers.authorization',
        'req.headers.cookie',
        'query',
        '*.query',
      ],
      censor: '[REDACTED]',
    },
    base: { service: 'lucio' },
  });
}

export function anonymizeId(id: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${id}`).digest('hex').slice(0, 12);
}

export type Logger = ReturnType<typeof createLogger>;
