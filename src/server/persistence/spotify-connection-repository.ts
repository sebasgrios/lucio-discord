import Database from 'better-sqlite3';
import type { TokenCipher } from './token-cipher.js';

interface SpotifyConnectionRow {
  guild_id: string;
  refresh_token_encrypted: string;
  created_at: string;
  updated_at: string;
}

export interface SpotifyConnection {
  guildId: string;
  refreshToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface SpotifyConnectionStatus {
  connected: boolean;
  connectedAt: string | null;
  updatedAt: string | null;
}

export class SpotifyConnectionRepository {
  readonly #database: Database.Database;

  constructor(
    path: string,
    private readonly cipher: TokenCipher,
  ) {
    this.#database = new Database(path);
    this.#database.pragma('journal_mode = WAL');
    this.migrate();
  }

  migrate(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS guild_spotify_connections (
        guild_id TEXT PRIMARY KEY,
        refresh_token_encrypted TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  get(guildId: string): SpotifyConnection | null {
    const row = this.#database
      .prepare('SELECT * FROM guild_spotify_connections WHERE guild_id = ?')
      .get(guildId) as SpotifyConnectionRow | undefined;
    if (!row) return null;
    return {
      guildId: row.guild_id,
      refreshToken: this.cipher.decrypt(row.refresh_token_encrypted),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  status(guildId: string): SpotifyConnectionStatus {
    const row = this.#database
      .prepare('SELECT created_at, updated_at FROM guild_spotify_connections WHERE guild_id = ?')
      .get(guildId) as Pick<SpotifyConnectionRow, 'created_at' | 'updated_at'> | undefined;
    return {
      connected: row !== undefined,
      connectedAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  }

  set(guildId: string, refreshToken: string): void {
    const now = new Date().toISOString();
    this.#database
      .prepare(
        `INSERT INTO guild_spotify_connections
          (guild_id, refresh_token_encrypted, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(guild_id) DO UPDATE SET
          refresh_token_encrypted = excluded.refresh_token_encrypted,
          updated_at = excluded.updated_at`,
      )
      .run(guildId, this.cipher.encrypt(refreshToken), now, now);
  }

  delete(guildId: string): boolean {
    return (
      this.#database
        .prepare('DELETE FROM guild_spotify_connections WHERE guild_id = ?')
        .run(guildId).changes > 0
    );
  }

  close(): void {
    this.#database.close();
  }
}
