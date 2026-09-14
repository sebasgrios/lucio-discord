# Historial de cambios

Este proyecto sigue [Semantic Versioning](https://semver.org/lang/es/) y agrupa los cambios por versión publicada.

## [1.0.0] — 2026-09-14

Primera versión estable de Lucio.

### Reproducción

- Resolución de búsquedas, vídeos y playlists de YouTube.
- Integración opcional de Spotify por servidor para pistas, álbumes y playlists propias o colaborativas.
- Inicio progresivo de álbumes y playlists, caché de resolución y prefetch de la siguiente pista.
- Passthrough WebM Opus y fallback FFmpeg a Opus de 128 kbps.
- Cola, repetición, autoplay, mezcla, votación de salto y controles interactivos.

### Discord y web

- Dieciséis comandos slash con respuestas y errores localizados.
- Panel interactivo único que se reemplaza al cambiar de canción.
- Landing bilingüe, OAuth de Discord, cards de servidores y dashboard sincronizado.
- Onboarding visual de cinco pasos y configuración web por servidor.

### Infraestructura y seguridad

- Contenedor no privilegiado desplegable en Railway con SQLite persistente.
- Cifrado AES-256-GCM para refresh tokens de Spotify.
- Validación anti-SSRF, rate limiting, cookies seguras y estados OAuth de un solo uso.
- Dependencias auditadas, acciones de CI fijadas por commit y `yt-dlp` verificado mediante SHA-256.

La versión se publica como software autoalojable; no mantiene una instancia pública oficial.

[1.0.0]: https://github.com/sebasgrios/lucio-discord/releases/tag/v1.0.0
