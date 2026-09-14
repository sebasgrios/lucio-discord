import Database from 'better-sqlite3';
import type { GuildSettings, Locale } from '../../shared/index.js';

interface SettingsRow {
  guild_id: string;
  locale: Locale;
  command_channel_id: string | null;
  dj_role_id: string | null;
  created_at: string;
  updated_at: string;
}

export class SettingsRepository {
  readonly #database: Database.Database;

  constructor(path: string) {
    this.#database = new Database(path);
    this.#database.pragma('journal_mode = WAL');
    this.#database.pragma('foreign_keys = ON');
    this.migrate();
  }

  migrate(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id TEXT PRIMARY KEY,
        locale TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
        command_channel_id TEXT,
        dj_role_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS web_user_preferences (
        discord_user_id TEXT PRIMARY KEY,
        onboarding_completed_at TEXT
      );
    `);
  }

  get(guildId: string): GuildSettings {
    const row = this.#database
      .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
      .get(guildId) as SettingsRow | undefined;
    if (row) return mapRow(row);

    const now = new Date().toISOString();
    this.#database
      .prepare(
        `INSERT INTO guild_settings
          (guild_id, locale, command_channel_id, dj_role_id, created_at, updated_at)
         VALUES (?, 'es', NULL, NULL, ?, ?)`,
      )
      .run(guildId, now, now);
    return this.get(guildId);
  }

  update(
    guildId: string,
    patch: Partial<Pick<GuildSettings, 'locale' | 'commandChannelId' | 'djRoleId'>>,
  ): GuildSettings {
    const current = this.get(guildId);
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    this.#database
      .prepare(
        `UPDATE guild_settings
         SET locale = ?, command_channel_id = ?, dj_role_id = ?, updated_at = ?
         WHERE guild_id = ?`,
      )
      .run(next.locale, next.commandChannelId, next.djRoleId, next.updatedAt, guildId);
    return next;
  }

  ping(): boolean {
    return (this.#database.prepare('SELECT 1 AS ok').get() as { ok: number }).ok === 1;
  }

  hasCompletedOnboarding(userId: string): boolean {
    const row = this.#database
      .prepare('SELECT onboarding_completed_at FROM web_user_preferences WHERE discord_user_id = ?')
      .get(userId) as { onboarding_completed_at: string | null } | undefined;
    return row?.onboarding_completed_at !== null && row?.onboarding_completed_at !== undefined;
  }

  completeOnboarding(userId: string): void {
    const completedAt = new Date().toISOString();
    this.#database
      .prepare(
        `INSERT INTO web_user_preferences (discord_user_id, onboarding_completed_at)
         VALUES (?, ?)
         ON CONFLICT(discord_user_id) DO UPDATE SET
          onboarding_completed_at = excluded.onboarding_completed_at`,
      )
      .run(userId, completedAt);
  }

  close(): void {
    this.#database.close();
  }
}

function mapRow(row: SettingsRow): GuildSettings {
  return {
    guildId: row.guild_id,
    locale: row.locale,
    commandChannelId: row.command_channel_id,
    djRoleId: row.dj_role_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
