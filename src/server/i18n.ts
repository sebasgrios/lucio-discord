import type { Locale } from '../shared/index.js';
import type { ErrorCode } from './domain/errors.js';

const copy = {
  es: {
    added: (count: number) =>
      count === 1 ? 'Añadida 1 pista a la cola.' : `Añadidas ${count} pistas a la cola.`,
    resolvingRemaining: (count: number) =>
      `Añadida la primera pista a la cola. Preparando hasta ${count} pista${count === 1 ? '' : 's'} más en segundo plano.`,
    emptyQueue: 'La cola está vacía.',
    nowPlayingEmpty: 'No hay ninguna pista activa.',
    nowPlaying: (title: string, artist: string) => `Ahora suena **${title}** — ${artist}`,
    paused: 'Reproducción pausada.',
    resumed: 'Reproducción reanudada.',
    skipped: 'Pista saltada.',
    vote: (votes: number, required: number) => `Voto registrado (${votes}/${required}).`,
    stopped: 'Reproducción detenida y cola vaciada.',
    left: 'Lucio ha salido del canal.',
    removed: (title: string) => `Eliminada **${title}**.`,
    reordered: 'Cola reordenada.',
    cleared: 'Cola vaciada.',
    shuffled: 'Cola mezclada.',
    loopUpdated: 'Modo de repetición actualizado.',
    autoplayUpdated: 'Autoplay actualizado.',
    controlApplied: 'Control aplicado.',
    settingsUpdated: 'Configuración actualizada.',
    spotifySetupAdmin:
      'Spotify no está vinculado en este servidor.\n1. Pulsa **Vincular Spotify**.\n2. Inicia sesión y autoriza la lectura de playlists.\n3. Regresa a Discord y repite `/play`.\nMientras tanto, esta solicitud se resolverá mediante YouTube.',
    spotifySetupMember:
      'Spotify no está vinculado en este servidor. Contacta con un administrador y pídele que ejecute `/setup`. Mientras tanto, esta solicitud se resolverá mediante YouTube.',
    spotifyPlaylistBlocked:
      'Las playlists de Spotify no se reproducen sin vincular una cuenta. No se intentará una alternativa automática para evitar importar una lista incorrecta.',
    spotifySetupReady:
      'Vincula una cuenta de Spotify para importar pistas, álbumes y playlists propias o colaborativas. Si no, la música continuará reproduciéndose desde YouTube.',
    spotifySetupConnected:
      'Spotify ya está vinculado en este servidor. Puedes volver a autorizar la cuenta o desconectarla.',
    spotifySetupUnavailable:
      'La vinculación con Spotify no está disponible porque faltan las credenciales globales. Lucio continuará funcionando mediante YouTube.',
    spotifyDisconnected: 'Spotify se ha desconectado de este servidor.',
    spotifyLinked: 'Spotify se ha vinculado correctamente a este servidor.',
    spotifyConnect: 'Vincular Spotify',
    spotifyReconnect: 'Volver a vincular',
    spotifyDisconnect: 'Desconectar Spotify',
    initialSetup:
      'Lucio necesita una configuración inicial. Un administrador puede ejecutar `/setup` para vincular Spotify. Si no se vincula, la reproducción seguirá disponible mediante YouTube.',
    more: (count: number) => `…y ${count} más.`,
    readyTitle: 'Lucio está listo',
    readyBody: 'Añade música con `/play`.',
    state: 'Estado',
    queue: 'Cola',
    listeners: 'Oyentes',
    pause: 'Pausa',
    resume: 'Reanudar',
    skip: 'Saltar',
    shuffle: 'Mezclar',
    repeat: 'Repetir',
    stop: 'Parar',
  },
  en: {
    added: (count: number) => `${count} track${count === 1 ? '' : 's'} added to the queue.`,
    resolvingRemaining: (count: number) =>
      `The first track was added. Preparing up to ${count} more track${count === 1 ? '' : 's'} in the background.`,
    emptyQueue: 'The queue is empty.',
    nowPlayingEmpty: 'There is no active track.',
    nowPlaying: (title: string, artist: string) => `Now playing **${title}** — ${artist}`,
    paused: 'Playback paused.',
    resumed: 'Playback resumed.',
    skipped: 'Track skipped.',
    vote: (votes: number, required: number) => `Vote registered (${votes}/${required}).`,
    stopped: 'Playback stopped and queue cleared.',
    left: 'Lucio left the channel.',
    removed: (title: string) => `Removed **${title}**.`,
    reordered: 'Queue reordered.',
    cleared: 'Queue cleared.',
    shuffled: 'Queue shuffled.',
    loopUpdated: 'Repeat mode updated.',
    autoplayUpdated: 'Autoplay updated.',
    controlApplied: 'Control applied.',
    settingsUpdated: 'Settings updated.',
    spotifySetupAdmin:
      'Spotify is not connected in this server.\n1. Click **Connect Spotify**.\n2. Sign in and allow playlist read access.\n3. Return to Discord and repeat `/play`.\nThis request will use YouTube in the meantime.',
    spotifySetupMember:
      'Spotify is not connected in this server. Contact an administrator and ask them to run `/setup`. This request will use YouTube in the meantime.',
    spotifyPlaylistBlocked:
      'Spotify playlists cannot be played without a connected account. No automatic alternative will be attempted to avoid importing the wrong playlist.',
    spotifySetupReady:
      'Connect a Spotify account to import tracks, albums, and owned or collaborative playlists. Audio will continue to play from YouTube.',
    spotifySetupConnected:
      'Spotify is already connected in this server. You can authorize the account again or disconnect it.',
    spotifySetupUnavailable:
      'Spotify connection is unavailable because the global credentials are missing. Lucio will continue to work through YouTube.',
    spotifyDisconnected: 'Spotify has been disconnected from this server.',
    spotifyLinked: 'Spotify was successfully connected to this server.',
    spotifyConnect: 'Connect Spotify',
    spotifyReconnect: 'Reconnect',
    spotifyDisconnect: 'Disconnect Spotify',
    initialSetup:
      'Lucio needs initial configuration. An administrator can run `/setup` to connect Spotify. Without a connection, playback remains available through YouTube.',
    more: (count: number) => `…and ${count} more.`,
    readyTitle: 'Lucio is ready',
    readyBody: 'Add music with `/play`.',
    state: 'Status',
    queue: 'Queue',
    listeners: 'Listeners',
    pause: 'Pause',
    resume: 'Resume',
    skip: 'Skip',
    shuffle: 'Shuffle',
    repeat: 'Repeat',
    stop: 'Stop',
  },
} as const;

export function messages(locale: Locale) {
  return copy[locale];
}

const errors: Record<Locale, Partial<Record<ErrorCode, string>>> = {
  es: {},
  en: {
    CAPACITY_REACHED: 'Lucio is already handling another session. Try again later.',
    EMPTY_QUEUE: 'There is no active session.',
    INVALID_POSITION: 'That queue position does not exist.',
    NOT_IN_VOICE: 'You must be in a voice channel.',
    WRONG_VOICE_CHANNEL: 'You must be in Lucio’s voice channel.',
    NOT_AUTHORIZED: 'You are not authorized to do that.',
    QUEUE_FULL: 'The queue is full.',
    SOURCE_UNAVAILABLE: 'The source could not resolve this request.',
    SPOTIFY_NOT_CONFIGURED: 'Spotify is not connected in this server.',
    SPOTIFY_PLAYLIST_FORBIDDEN:
      'The connected account must own or collaborate on this Spotify playlist.',
    UNSUPPORTED_INPUT: 'This source or input is not supported.',
    TRACK_TOO_LONG: 'This track is too long.',
    LIVE_NOT_SUPPORTED: 'Live streams are not supported.',
    RATE_LIMITED: 'You are doing that too quickly. Try again later.',
    INTERNAL_ERROR: 'An unexpected error occurred.',
  },
};

export function localizedError(locale: Locale, code: ErrorCode, fallback: string): string {
  return errors[locale][code] ?? fallback;
}
