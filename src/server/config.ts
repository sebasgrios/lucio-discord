import { z } from 'zod';

const optionalEnvironmentString = (schema: z.ZodString = z.string().min(1)) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DISCORD_TOKEN: z.string().min(1).optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_CLIENT_SECRET: z.string().min(1).optional(),
  DEV_GUILD_ID: z.string().min(1).optional(),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  DATABASE_PATH: z.string().default('./lucio.db'),
  SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
  SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
  YTDLP_PATH: z.string().default('yt-dlp'),
  YTDLP_CACHE_DIR: optionalEnvironmentString(),
  YTDLP_COOKIES_PATH: optionalEnvironmentString(),
  YOUTUBE_COOKIES_BASE64: optionalEnvironmentString(z.string().min(1).max(3_000_000)),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  SKIP_DISCORD_LOGIN: z.enum(['true', 'false']).default('false'),
});

export type AppConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Configuración inválida: ${z.prettifyError(result.error)}`);
  }
  if (
    result.data.NODE_ENV === 'production' &&
    result.data.SESSION_SECRET.startsWith('development-')
  ) {
    throw new Error('SESSION_SECRET debe configurarse en producción.');
  }
  return result.data;
}
