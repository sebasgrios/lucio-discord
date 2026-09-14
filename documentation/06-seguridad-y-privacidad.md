# Seguridad y privacidad

- OAuth usa `state`, cookies `HttpOnly`, `Secure` en producción y `SameSite=Lax`.
- Las sesiones tienen expiración corta y las mutaciones validan origen, usuario, servidor y canal de voz.
- Las sesiones OAuth de Discord permanecen en memoria. De Spotify se persiste únicamente el refresh token imprescindible por servidor, cifrado con AES-256-GCM mediante una clave derivada de `SESSION_SECRET`; los access tokens permanecen en memoria. No se guardan nombres de Spotify, consultas, historial musical ni actividad individual.
- El identificador de Discord se guarda en `web_user_preferences` únicamente para recordar la finalización del tutorial; no se persisten el nombre, avatar ni lista de servidores del usuario.
- La landing no incorpora analítica, píxeles publicitarios ni cookies de seguimiento. La preferencia de idioma usa almacenamiento local y la cookie de sesión es estrictamente técnica.
- Los enlaces de vinculación de `/setup` usan 256 bits aleatorios, caducan a los diez minutos y se consumen una sola vez. Solo quienes tienen `Gestionar servidor` pueden generarlos o desconectar Spotify.
- Los logs excluyen secretos, consultas completas y datos personales.
- El registro automático de solicitudes HTTP está desactivado para no conservar direcciones IP, cabeceras ni cookies; solo se emiten eventos operativos explícitos y agregados.
- Se permiten únicamente protocolos y hosts de medios conocidos; se bloquean direcciones privadas para reducir SSRF.
- Los procesos externos reciben arrays de argumentos y nunca comandos interpolados.
- Límites predeterminados: cinco solicitudes de reproducción/importación y treinta controles por minuto y usuario.

## Integridad de la cadena de suministro

- El lockfile de pnpm conserva la integridad de cada paquete y CI rechaza instalaciones que no coincidan con él.
- CI ejecuta `pnpm audit --audit-level low`; la publicación `1.0.0` no contiene vulnerabilidades conocidas en dependencias de producción ni desarrollo.
- Las acciones de GitHub están fijadas a commits inmutables.
- La imagen base de Node está fijada por digest y los binarios de `yt-dlp` se validan mediante SHA-256 antes de ejecutarse.
- El contenedor final usa un usuario sin privilegios y solo persiste el directorio `/data`.

La política de comunicación responsable está en [`SECURITY.md`](../SECURITY.md).
