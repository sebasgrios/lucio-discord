import { describe, expect, it } from 'vitest';
import { commands } from '../src/server/discord/commands.js';

describe('Discord commands', () => {
  it('publica setup de forma visible y valida permisos durante la ejecución', () => {
    const setup = commands.find((command) => command.name === 'setup');
    expect(setup).toBeDefined();
    expect(setup?.default_member_permissions).toBeUndefined();
  });
});
