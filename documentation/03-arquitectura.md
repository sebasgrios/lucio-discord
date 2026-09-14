# Arquitectura

Lucio se entrega como un único contenedor, pero separa sus responsabilidades mediante interfaces para permitir extraer el motor de audio en el futuro.

## Componentes

- **Discord:** gateway, comandos, botones y estados de voz.
- **Dominio:** sesiones, cola, votos, límites y transiciones.
- **Fuentes:** resolución de YouTube y metadatos de Spotify con autorización por servidor.
- **Audio:** selección Opus, passthrough y fallback FFmpeg.
- **Servidor:** API REST, OAuth, healthchecks y WebSocket.
- **Panel:** SPA React/Vite con landing pública, páginas legales, dashboard y onboarding.
- **Persistencia:** SQLite para configuración, vínculos y preferencia de onboarding; sesiones y colas en memoria.

## Modelos compartidos

`GuildSettings`, `Track`, `QueueItem`, `PlaybackState`, `SessionSnapshot`, `SourceAdapter` y `AudioPipeline` forman el contrato entre capas. `Track.audioFormat` permite reutilizar la selección realizada al resolver la fuente y `SessionSnapshot.capturedAt` sirve de ancla para calcular el progreso en el navegador. Las mutaciones de Discord y web atraviesan el mismo servicio de aplicación.

## Camino crítico de reproducción

Cuando todavía no existe una sesión, la conexión al canal de voz y la resolución de la fuente se ejecutan en paralelo. Las búsquedas de candidatos para Spotify utilizan metadatos planos y solo inspeccionan el formato del candidato elegido. Las búsquedas normales y los enlaces directos conservan un descriptor privado y temporal de la descarga ya seleccionada, que nunca forma parte de `Track`, los snapshots ni la API web. El pipeline consume directamente este descriptor y vuelve a ejecutar `yt-dlp` si ha caducado o la CDN lo rechaza.

Cada servidor dispone de una conexión Spotify independiente. `/setup` emite un estado OAuth aleatorio, efímero y de un solo uso; el callback intercambia el código en el backend. Solo el refresh token cifrado se conserva en SQLite, mientras los access tokens permanecen en memoria. La resolución recibe siempre el identificador del servidor para seleccionar su autorización sin mezclar credenciales entre comunidades.

La resolución ofrece un primer lote y, opcionalmente, una continuación diferida. Así, álbumes y listas empiezan con la primera pista y completan la cola después de que el audio sea audible. El pipeline prepara el descriptor de la siguiente pista mientras suena la actual.

El presentador de Discord se comparte entre las entradas web y slash command. Mantiene una cola de renderizado por sesión, publica el primer panel después de arrancar la pista y sustituye el mensaje cuando cambia el identificador de pista.

## Estado

La configuración y la fecha de finalización del onboarding por identificador de Discord se persisten en SQLite con migraciones y WAL. La sesión web de Discord permanece en memoria. La reproducción es efímera: un reinicio termina las sesiones y vacía las colas de forma deliberada.

Al completar OAuth, el backend conserva en la sesión los servidores que el usuario puede gestionar, estén o no ocupados por Lucio. `botInstalled` se recalcula contra la caché de Discord en cada lectura de `/api/me`; las rutas de configuración y reproducción vuelven a exigir que Lucio esté instalado. `/invite` genera una autorización con permisos mínimos y admite preseleccionar el servidor desde una card.
