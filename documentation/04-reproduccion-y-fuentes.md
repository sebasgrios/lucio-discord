# Reproducción y fuentes

## Canal de audio

Lucio solicita primero WebM Opus compatible con Discord y lo transmite sin recodificar. Si YouTube no ofrece ese formato, utiliza el mejor audio disponible y FFmpeg lo codifica como Opus a 128 kbps. No se aplica volumen global ni procesado.

Para reducir el tiempo hasta el primer audio, la URL firmada, sus cabeceras permitidas, formato y caducidad se conservan en un almacén privado en memoria. El pipeline descarga ese medio directamente y evita repetir la extracción completa. Solo las entradas planas procedentes de playlists, autoplay o emparejamiento de Spotify requieren una inspección posterior; esa inspección también genera el descriptor consumido por la reproducción y no se repite. Ante caducidad, host no permitido, manifiesto incompatible o error de CDN se usa `yt-dlp` como fallback.

Los descriptores admiten únicamente HTTPS de `googlevideo.com`, filtran cabeceras sensibles, tienen caducidad y un límite de 500 elementos. Nunca se serializan ni registran. Las búsquedas recientes se cachean durante diez minutos mediante una clave SHA-256 que no conserva la consulta original ni el solicitante.

## YouTube

Las búsquedas, vídeos y playlists se resuelven con `yt-dlp`. La integración habilita explícitamente Node como runtime JavaScript para resolver los desafíos actuales de YouTube tanto al buscar como al inspeccionar y reproducir audio. Las IP de centros de datos pueden requerir autenticación adicional; Lucio admite un archivo Netscape mediante `YTDLP_COOKIES_PATH` o su contenido Base64 mediante `YOUTUBE_COOKIES_BASE64`. El archivo temporal generado desde Base64 tiene permisos restringidos, se elimina al apagar y su contenido nunca se registra. Es una integración de mejor esfuerzo: un cambio del proveedor puede interrumpirla temporalmente. No se usan entradas del usuario para construir comandos shell.

## Spotify

La API oficial aporta metadatos de pistas, álbumes y playlists autorizadas. Cada servidor puede vincular una cuenta mediante Authorization Code OAuth con los permisos `playlist-read-private` y `playlist-read-collaborative`. Spotify solo entrega los elementos de playlists que esa cuenta posea o en las que colabore; las playlists públicas ajenas se rechazan con una explicación y nunca se sustituyen automáticamente por otra lista.

Lucio busca candidatos planos en YouTube y los puntúa por título, artista y duración sin resolver por completo cada resultado. Una coincidencia de confianza insuficiente se omite. En álbumes y playlists se resuelve primero una pista; cuando empieza a sonar, el resto se empareja en segundo plano con concurrencia máxima de dos. Si el servidor no ha vinculado Spotify, las pistas y álbumes siguen usando los metadatos públicos de la aplicación y se reproducen mediante YouTube, acompañados por instrucciones de configuración. Las playlists se detienen antes de conectar al canal de voz.

## Fallos y autoplay

Una pista fallida se omite, se muestra un código breve y la cola continúa. Autoplay consulta el mix asociado a la última pista y evita las veinte reproducciones recientes.

Al comenzar una pista, Lucio inspecciona anticipadamente la siguiente si todavía no dispone de descriptor. La descarga de audio no se inicia hasta que le corresponde, de modo que el prefetch no consume ancho de banda de la canción completa.
