# Operación y observabilidad

Los logs son JSON e incluyen nivel, componente, duración y código de error. El registro automático de solicitudes está desactivado: no se conservan IP, cabeceras, cookies, identificadores de usuario ni consultas. Los identificadores operativos de servidor solo se incluyen cuando son imprescindibles para diagnosticar un fallo de entrega y nunca se acompañan de nombres.

- `/health/live` confirma que el proceso responde.
- `/health/ready` confirma SQLite y el estado del gateway de Discord.
- Los contadores agregados viven en memoria y se reinician con el proceso.
- La admisión se cierra antes de superar el límite de sesiones o resoluciones.
- Un error mostrado al usuario incluye un código correlacionable, no detalles internos.

Ante un fallo de proveedor, se verifica primero el chequeo externo y la versión fijada del extractor. Ante presión de memoria, se mantiene la sesión activa y se rechazan nuevas importaciones o conexiones.

Ante latencia de arranque se separan la espera del semáforo, resolución de metadatos, conexión de voz, disponibilidad del primer byte y transición real de `AudioPlayer` a `Playing`. La conexión y la resolución inicial se solapan. Cada solicitud aceptada registra duraciones, cantidad de pistas, fuente, uso del camino directo o fallback, transcodificación y si inició reproducción, sin registrar consultas, URLs firmadas ni datos personales.

El estado permanece en `loading` hasta que Discord confirma `AudioPlayerStatus.Playing`; en ese momento comienza también el reloj de progreso. Los objetivos operativos son una mediana inferior a 2,5 segundos para YouTube, inferior a 3,5 segundos para Spotify y cambios de pista inferiores a 500 ms una vez reunida una muestra representativa en producción.
