import { describe, expect, it } from 'vitest';
import { calculatePlaybackPosition } from '../src/shared/progress.js';
import type { SessionSnapshot } from '../src/shared/types.js';
import { track } from './helpers.js';

function snapshot(status: SessionSnapshot['state']['status']): SessionSnapshot {
  return {
    capturedAt: '2026-09-13T10:00:10.000Z',
    guildId: 'guild',
    voiceChannelId: 'voice',
    textChannelId: 'text',
    panelMessageId: null,
    state: {
      status,
      current: { ...track({ durationMs: 180_000 }), enqueuedAt: '2026-09-13T10:00:00.000Z' },
      positionMs: 10_000,
      startedAt: '2026-09-13T10:00:00.000Z',
      loopMode: 'off',
      autoplay: false,
    },
    queue: [],
    listenerCount: 1,
    skipVotes: 0,
    skipVotesRequired: 1,
  };
}

describe('calculatePlaybackPosition', () => {
  it('avanza desde el instante en que se capturó el estado sin duplicar el tiempo', () => {
    expect(
      calculatePlaybackPosition(snapshot('playing'), Date.parse('2026-09-13T10:00:12.000Z')),
    ).toBe(12_000);
  });

  it('mantiene la posición congelada al pausar y vuelve a cero al detener', () => {
    expect(
      calculatePlaybackPosition(snapshot('paused'), Date.parse('2026-09-13T10:01:00.000Z')),
    ).toBe(10_000);
    expect(calculatePlaybackPosition(null, Date.now())).toBe(0);
  });
});
