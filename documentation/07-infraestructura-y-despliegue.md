# Infraestructura y despliegue

## Railway

Un contenedor Debian slim ejecuta Node, FFmpeg y el binario autónomo `yt-dlp_linux`. Node también actúa como runtime JavaScript de `yt-dlp`, por lo que no es necesario instalar Deno dentro de la imagen. La imagen base se fija por digest, el binario se fija en `2026.08.19` y su SHA-256 se comprueba durante la construcción. SQLite y la caché persistente de firmas de `yt-dlp` residen en el volumen `/data`; `YTDLP_CACHE_DIR` vale `/data/yt-dlp-cache` dentro de la imagen. El servidor escucha en `PORT` y ofrece `/health/live` y `/health/ready`.

La infraestructura reutilizable se declara en `.railway/railway.ts`. Este archivo conserva variables existentes sin incluir sus valores, define el volumen, configura `/health/live` como healthcheck y ejecuta la sincronización global de comandos antes de cada despliegue. No existe actualmente un proyecto Railway oficial activo; la plantilla sirve para crear una instalación propia.

La configuración predeterminada admite una sesión global y protege la reproducción existente para mantenerse dentro de recursos modestos. Escalar a diez sesiones o separar audio requiere dimensionar memoria, CPU y presupuesto en el proveedor elegido. Consulta los [precios vigentes de Railway](https://railway.com/pricing) antes de crear una instalación.

## Rama y versiones

- `develop` es actualmente la rama de integración y publicación del repositorio.
- Las versiones estables usan Semantic Versioning y tags anotados `vMAJOR.MINOR.PATCH`.
- `v1.0.0` es la primera publicación estable; su contenido se documenta en [`CHANGELOG.md`](../CHANGELOG.md).
- La publicación en producción se realiza explícitamente mediante Railway CLI desde una revisión verificada.
- El predespliegue sincroniza los comandos globales de forma idempotente.

## Railway CLI

```bash
railway config plan
railway config apply
railway up --service lucio-discord --environment production
```

El plan debe revisarse antes de aplicarlo y no debe proponer la eliminación de variables ni del volumen. Tras `railway up`, debe esperarse el estado `SUCCESS` y comprobar `/health/live`, `/health/ready`, la landing y un recurso estático.

## Variables

Discord requiere token, client ID, client secret, URL OAuth y secreto de sesión. Spotify se habilita al proporcionar client ID y client secret. En Spotify Developer Dashboard debe registrarse exactamente `${PUBLIC_BASE_URL}/auth/spotify/callback`; Discord requiere `${PUBLIC_BASE_URL}/auth/discord/callback`. `SESSION_SECRET` protege cookies y deriva la clave de cifrado de los refresh tokens, por lo que cambiarlo invalida las autorizaciones ya guardadas. `DATABASE_PATH` apunta por defecto a `/data/lucio.db` en producción. Si YouTube exige verificar la IP del proveedor, `YOUTUBE_COOKIES_BASE64` debe contener un archivo Netscape de `youtube.com` codificado en Base64. Para desarrollo local puede utilizarse `YTDLP_COOKIES_PATH` en su lugar.

La aplicación de Spotify permanece en modo desarrollo: su cuenta propietaria debe mantener Premium, admite hasta cinco usuarios autorizados y cada uno debe estar en la allowlist del panel de desarrolladores. `/setup` permite renovar una autorización caducada sin intervenir en Railway.

Las credenciales se administran como variables selladas en Railway y no se escriben en el archivo de infraestructura ni en el repositorio.
