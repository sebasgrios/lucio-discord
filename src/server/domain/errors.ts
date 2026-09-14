export type ErrorCode =
  | 'CAPACITY_REACHED'
  | 'EMPTY_QUEUE'
  | 'INVALID_POSITION'
  | 'NOT_IN_VOICE'
  | 'WRONG_VOICE_CHANNEL'
  | 'NOT_AUTHORIZED'
  | 'QUEUE_FULL'
  | 'SOURCE_UNAVAILABLE'
  | 'SPOTIFY_NOT_CONFIGURED'
  | 'SPOTIFY_PLAYLIST_FORBIDDEN'
  | 'UNSUPPORTED_INPUT'
  | 'TRACK_TOO_LONG'
  | 'LIVE_NOT_SUPPORTED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class LucioError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'LucioError';
  }
}
