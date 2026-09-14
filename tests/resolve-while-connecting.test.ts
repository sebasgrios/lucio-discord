import { describe, expect, it, vi } from 'vitest';
import { resolveWhileConnecting } from '../src/server/audio/resolve-while-connecting.js';

describe('resolveWhileConnecting', () => {
  it('espera resolución y conexión en paralelo', async () => {
    const connection = { destroy: vi.fn() };
    await expect(
      resolveWhileConnecting(Promise.resolve(['track']), Promise.resolve(connection)),
    ).resolves.toEqual({ resolved: ['track'], connection });
    expect(connection.destroy).not.toHaveBeenCalled();
  });

  it('destruye una conexión creada cuando falla la resolución', async () => {
    const connection = { destroy: vi.fn() };
    await expect(
      resolveWhileConnecting(
        Promise.reject(new Error('source failed')),
        Promise.resolve(connection),
      ),
    ).rejects.toThrow('source failed');
    expect(connection.destroy).toHaveBeenCalledOnce();
  });
});
