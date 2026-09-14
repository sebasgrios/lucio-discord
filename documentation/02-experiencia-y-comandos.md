# Experiencia y comandos

Lucio mantiene un único mensaje de reproductor activo. La primera publicación se realiza cuando la pista inicial ya está seleccionada. Al cambiar de pista elimina el panel anterior y publica uno nuevo al final del canal; los cambios de pausa, cola, repetición y autoplay editan el panel vigente. Los cambios consecutivos se agrupan y se renderizan de forma serializada para impedir duplicados. Las confirmaciones y errores de comandos son efímeros para no llenar el canal.

La confirmación de `/play` concuerda con el resultado: `Añadida 1 pista a la cola.` para una pista y `Añadidas N pistas a la cola.` para varias.

Los álbumes y las playlists admitidas de Spotify se incorporan progresivamente: Lucio arranca la primera pista y prepara el resto en segundo plano. La confirmación indica cuántas pistas adicionales se están preparando y la importación pendiente se cancela si se vacía o detiene la sesión.

Al incorporarse a un servidor, Lucio publica una indicación de configuración inicial. `/setup` está reservado a miembros con `Gestionar servidor` y entrega un enlace OAuth de Spotify de un solo uso con diez minutos de validez. El administrador solo necesita abrirlo, iniciar sesión y aceptar la lectura de playlists. Al finalizar, la web confirma el resultado y Lucio publica también una confirmación en el mismo canal donde se solicitó `/setup`. Si ese canal ya no está disponible, recurre al canal de comandos configurado, al canal del sistema o al primer canal disponible, por ese orden. También puede volver a vincular o desconectar la cuenta desde el mismo comando o desde el panel web.

Si se pega una pista o un álbum de Spotify sin vínculo, Lucio explica el paso de configuración según el rol del solicitante y reproduce mediante la búsqueda equivalente en YouTube. Al administrador le ofrece directamente el botón OAuth; al resto le indica que contacte con un administrador y solicite `/setup`. Una playlist sin vínculo se rechaza sin buscar una alternativa automática. Una playlist vinculada también se rechaza cuando la cuenta no es su propietaria ni colaboradora.

`/stop` confirma la interacción a Discord antes de desmontar la reproducción y después muestra `Reproducción detenida y cola vaciada.`. El cierre desacopla de forma controlada la descarga y FFmpeg para que una tubería ya cerrada no reinicie el servicio.

## Comandos

- Reproducción: `/play`, `/queue`, `/nowplaying`, `/pause`, `/resume`, `/skip`, `/stop`, `/leave`.
- Cola: `/remove`, `/move`, `/clear`, `/shuffle`, `/loop`, `/autoplay`.
- Administración: `/setup`, `/settings`.

## Reglas

- Solo los usuarios conectados al canal de voz activo pueden controlar la reproducción.
- Solicitante, administradores y rol DJ saltan inmediatamente; los demás votan. Se requieren `floor(oyentes humanos / 2) + 1` votos únicos.
- La cola es FIFO, admite 500 elementos y cada importación añade como máximo 100.
- Una pista puede durar como máximo tres horas. No se admiten directos.
- Autoplay está desactivado por defecto y solo dura durante la sesión actual.
- Lucio sale tras cinco minutos sin cola o sin oyentes humanos.
- El volumen se ajusta individualmente desde Discord.

Los botones cubren pausa/reanudación, salto, parada, mezcla, repetición y autoplay.
