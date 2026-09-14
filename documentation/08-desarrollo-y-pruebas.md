# Desarrollo y pruebas

El proyecto usa Node 24, TypeScript estricto y pnpm 11. Antes de integrar un cambio deben superar auditoría, formato, lint, typecheck, tests, build web y build del servicio. `pnpm verify` ejecuta la cadena local determinista y `pnpm audit` comprueba avisos de seguridad conocidos.

## Estrategia

- Unitarias: cola, votos, permisos, límites, temporizadores, repetición, autoplay, progreso, coordinación de conexión y renderizado único del panel.
- Integración: SQLite, cifrado de tokens, OAuth de Discord y Spotify simulado, WebSocket, comandos y procesos de audio controlados.
- E2E: landing y páginas legales en móvil/escritorio, accesibilidad, dashboard y sincronización.
- Smoke: contenedor, FFmpeg, `yt-dlp`, healthchecks y cierre limpio.
- Un chequeo externo programado detecta cambios de proveedores sin bloquear PRs.
- Integridad: instalación con lockfile, auditoría de dependencias, acciones fijadas por SHA y comprobación SHA-256 de `yt-dlp`.

## Objetivos medibles

- Menos de 180 MB en reposo y 400 MB durante una sesión típica.
- Los fallos de pista no detienen la sesión.
- La saturación rechaza trabajo nuevo sin cortar audio existente.
- Discord y web exponen el mismo estado.
- Los cambios rápidos de estado mantienen un solo panel interactivo activo y cada cambio de pista sustituye el mensaje anterior.
- La conexión de voz no añade una espera secuencial a la resolución inicial.

## Capturas del onboarding

Las cinco capturas se generan desde la ruta local `/?tutorial-capture=1` hasta `5`, disponible únicamente en `localhost` y `127.0.0.1`. Deben capturarse a 1280 × 720 y guardarse como `web/public/assets/tutorial/step-N.png`. Este flujo mantiene las imágenes alineadas con el sistema visual real sin añadir una herramienta de diseño o una dependencia de ejecución al despliegue.
