import { randomBytes } from 'node:crypto';

export interface AuthorizedGuild {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
  botInstalled: boolean;
}

export interface WebSession {
  userId: string;
  displayName: string;
  avatar: string | null;
  guilds: AuthorizedGuild[];
  expiresAt: number;
}

export class AuthStore {
  readonly #sessions = new Map<string, WebSession>();

  create(session: WebSession): string {
    const id = randomBytes(32).toString('base64url');
    this.#sessions.set(id, session);
    const timer = setTimeout(
      () => this.#sessions.delete(id),
      Math.max(0, session.expiresAt - Date.now()),
    );
    timer.unref();
    return id;
  }

  get(id: string | undefined): WebSession | null {
    if (!id) return null;
    const session = this.#sessions.get(id);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.#sessions.delete(id);
      return null;
    }
    return session;
  }

  delete(id: string | undefined): void {
    if (id) this.#sessions.delete(id);
  }
}
