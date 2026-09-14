export const LIMITS = {
  maxSessions: 1,
  maxQueueSize: 500,
  maxPlaylistItems: 100,
  maxTrackDurationMs: 3 * 60 * 60 * 1_000,
  idleDisconnectMs: 5 * 60 * 1_000,
  recentAutoplaySize: 20,
  maxConcurrentResolutions: 2,
  playRequestsPerMinute: 5,
  controlsPerMinute: 30,
} as const;
