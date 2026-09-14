# Panel web

La web es una SPA oscura, musical y original, usable en móvil y escritorio. No transmite audio al navegador: explica el producto, dirige la instalación y controla la sesión del canal de Discord.

## Landing pública

La portada comunica rapidez, calidad, ligereza, control compartido y las diferencias entre YouTube y Spotify. Incluye navegación interna, preguntas frecuentes, llamada final a la instalación y páginas públicas de privacidad y condiciones. Evita métricas, contadores, testimonios o afirmaciones de disponibilidad que no puedan verificarse. El idioma se detecta desde el navegador y puede alternarse manualmente entre español e inglés; la elección se conserva de forma local.

## Acceso

- OAuth de Discord con scopes `identify` y `guilds`.
- Ser propietario o disponer de `Manage Guild` o `Administrator` para que el servidor aparezca en el dashboard.
- Presencia en el canal de voz activo para controlar el reproductor.

## Capacidades

- Cards de todos los servidores administrables, diferenciando Lucio instalado o pendiente de instalar.
- Invitación global desde la cabecera e invitación con servidor preseleccionado desde cada card pendiente.
- Pista, progreso, oyentes y cola en tiempo real.
- Controles equivalentes a Discord.
- Edición de idioma, canal de comandos y rol DJ.
- Vinculación, renovación y desconexión de Spotify por servidor para administradores.

## Primer acceso

Después del primer OAuth de Discord se abre un modal de cinco pasos: elegir servidor, entrar en voz, vincular Spotify opcionalmente con `/setup`, añadir la primera canción y controlar la cola entre Discord y la web. Cada paso utiliza una captura de interfaz versionada en `web/public/assets/tutorial/`. El tutorial admite teclado, puede omitirse y permanece disponible desde «Cómo funciona». Al cerrarlo por primera vez, el backend guarda únicamente que esa cuenta ya lo completó.

El estado se consulta por REST y se actualiza mediante WebSocket. La interfaz cumple criterios prácticos WCAG AA: teclado, foco visible, contraste, etiquetas y movimiento reducido.

La barra de progreso parte de `positionMs` en el instante `capturedAt`. Avanza únicamente durante `playing`, permanece congelada durante `paused` y vuelve a cero al detener la sesión. Los controles usan iconos SVG internos para mantener nitidez y evitar una dependencia de iconos externa.

La interfaz utiliza el icono y la paleta descritos en [Identidad visual](10-identidad-visual.md). El recurso se sirve también como favicon.

La tarjeta de administración muestra el estado de Spotify. La autorización se abre en una pestaña separada y, al completarse, el callback confirma que puede cerrarse y regresar a Discord o al panel. Lucio publica al mismo tiempo una confirmación en Discord sin exponer datos de la cuenta vinculada.
