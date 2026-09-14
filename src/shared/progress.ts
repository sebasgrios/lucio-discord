import type { SessionSnapshot } from './types.js';

export function calculatePlaybackPosition(snapshot: SessionSnapshot | null, now: number): number {
  const current = snapshot?.state.current;
  if (!snapshot || !current) return 0;
  const base = Math.max(0, snapshot.state.positionMs);
  if (snapshot.state.status !== 'playing') return Math.min(current.durationMs, base);
  const capturedAt = Date.parse(snapshot.capturedAt);
  const elapsed = Number.isFinite(capturedAt) ? Math.max(0, now - capturedAt) : 0;
  return Math.min(current.durationMs, base + elapsed);
}
