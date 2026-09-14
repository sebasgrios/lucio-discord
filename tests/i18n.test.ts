import { describe, expect, it } from 'vitest';
import { messages } from '../src/server/i18n.js';

describe('mensajes de cola', () => {
  it('concuerda género y número en español', () => {
    expect(messages('es').added(1)).toBe('Añadida 1 pista a la cola.');
    expect(messages('es').added(2)).toBe('Añadidas 2 pistas a la cola.');
    expect(messages('es').resolvingRemaining(2)).toContain('hasta 2 pistas');
  });

  it('mantiene singular y plural en inglés', () => {
    expect(messages('en').added(1)).toBe('1 track added to the queue.');
    expect(messages('en').added(2)).toBe('2 tracks added to the queue.');
    expect(messages('en').resolvingRemaining(2)).toContain('up to 2 more tracks');
  });

  it('explica la configuración de Spotify según el rol', () => {
    expect(messages('es').spotifySetupAdmin).toContain('Vincular Spotify');
    expect(messages('es').spotifySetupAdmin).toContain('/play');
    expect(messages('es').spotifySetupMember).toContain('/setup');
    expect(messages('es').spotifyPlaylistBlocked).toContain('no se reproducen');
    expect(messages('es').spotifySetupReady).toBe(
      'Vincula una cuenta de Spotify para importar pistas, álbumes y playlists propias o colaborativas. Si no, la música continuará reproduciéndose desde YouTube.',
    );
    expect(messages('es').spotifyLinked).toContain('vinculado correctamente');
  });
});
