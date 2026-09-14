import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsRepository } from '../src/server/persistence/settings-repository.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('SettingsRepository', () => {
  it('crea valores predeterminados y persiste cambios', () => {
    const directory = mkdtempSync(join(tmpdir(), 'lucio-test-'));
    directories.push(directory);
    const repository = new SettingsRepository(join(directory, 'settings.db'));
    expect(repository.get('guild').locale).toBe('es');
    repository.update('guild', { locale: 'en', djRoleId: 'dj' });
    expect(repository.get('guild')).toMatchObject({ locale: 'en', djRoleId: 'dj' });
    expect(repository.hasCompletedOnboarding('user')).toBe(false);
    repository.completeOnboarding('user');
    expect(repository.hasCompletedOnboarding('user')).toBe(true);
    expect(repository.ping()).toBe(true);
    repository.close();
  });
});
