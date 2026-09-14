export interface PlaybackTicketCandidate {
  url?: string;
  ext?: string;
  acodec?: string;
  protocol?: string;
  http_headers?: Record<string, string>;
}

export interface PlaybackTicket {
  mediaUrl: string;
  headers: Record<string, string>;
  ext: string | undefined;
  codec: string | undefined;
  expiresAt: number;
}

const ALLOWED_HEADERS = new Set(['accept', 'accept-language', 'origin', 'referer', 'user-agent']);
const DEFAULT_TTL_MS = 10 * 60_000;
const EXPIRY_MARGIN_MS = 30_000;

export class PlaybackTicketStore {
  readonly #tickets = new Map<string, PlaybackTicket>();

  constructor(private readonly maximumEntries = 500) {}

  set(trackId: string, candidate: PlaybackTicketCandidate): boolean {
    const ticket = createTicket(candidate);
    if (!ticket) return false;
    this.#tickets.delete(trackId);
    this.#tickets.set(trackId, ticket);
    while (this.#tickets.size > this.maximumEntries) {
      const oldest = this.#tickets.keys().next().value;
      if (!oldest) break;
      this.#tickets.delete(oldest);
    }
    return true;
  }

  get(trackId: string): PlaybackTicket | null {
    const ticket = this.#tickets.get(trackId);
    if (!ticket) return null;
    if (ticket.expiresAt <= Date.now() + EXPIRY_MARGIN_MS) {
      this.#tickets.delete(trackId);
      return null;
    }
    return ticket;
  }

  delete(trackId: string): void {
    this.#tickets.delete(trackId);
  }
}

function createTicket(candidate: PlaybackTicketCandidate): PlaybackTicket | null {
  if (!candidate.url) return null;
  if (candidate.protocol && candidate.protocol !== 'https' && candidate.protocol !== 'http')
    return null;
  let url: URL;
  try {
    url = new URL(candidate.url);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !isYouTubeMediaHost(url.hostname)) return null;
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(candidate.http_headers ?? {})) {
    const normalized = name.toLowerCase();
    if (ALLOWED_HEADERS.has(normalized)) headers[normalized] = value;
  }
  const expirySeconds = Number(url.searchParams.get('expire'));
  const expiresAt =
    Number.isFinite(expirySeconds) && expirySeconds > 0
      ? expirySeconds * 1_000
      : Date.now() + DEFAULT_TTL_MS;
  return {
    mediaUrl: url.toString(),
    headers,
    ext: candidate.ext,
    codec: candidate.acodec,
    expiresAt,
  };
}

function isYouTubeMediaHost(hostname: string): boolean {
  return (
    (hostname === 'googlevideo.com' || hostname.endsWith('.googlevideo.com')) &&
    hostname !== 'manifest.googlevideo.com'
  );
}
