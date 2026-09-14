import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const systemChrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    locale: 'es-ES',
    trace: 'retain-on-failure',
    ...(existsSync(systemChrome) ? { launchOptions: { executablePath: systemChrome } } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://127.0.0.1:3000/health/live',
    reuseExistingServer: true,
    env: {
      SKIP_DISCORD_LOGIN: 'true',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-characters',
    },
  },
});
