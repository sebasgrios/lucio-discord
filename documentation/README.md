# Documentación de Lucio

Este directorio es la fuente de verdad funcional y técnica de Lucio. Los documentos están numerados en el orden recomendado de lectura.

| Documento                                                               | Contenido                                  | Estado           |
| ----------------------------------------------------------------------- | ------------------------------------------ | ---------------- |
| [01 — Producto y alcance](01-producto-y-alcance.md)                     | Objetivo, audiencia, alcance y exclusiones | Aprobado para v1 |
| [02 — Experiencia y comandos](02-experiencia-y-comandos.md)             | Comandos, controles, cola y permisos       | Aprobado para v1 |
| [03 — Arquitectura](03-arquitectura.md)                                 | Componentes, datos e interfaces            | Aprobado para v1 |
| [04 — Reproducción y fuentes](04-reproduccion-y-fuentes.md)             | Audio, YouTube, Spotify y fallos           | Aprobado para v1 |
| [05 — Panel web](05-panel-web.md)                                       | Landing, OAuth, onboarding y dashboard     | Aprobado para v1 |
| [06 — Seguridad y privacidad](06-seguridad-y-privacidad.md)             | Autorización, datos y mitigaciones         | Aprobado para v1 |
| [07 — Infraestructura y despliegue](07-infraestructura-y-despliegue.md) | Railway, Docker, ramas y variables         | Aprobado para v1 |
| [08 — Desarrollo y pruebas](08-desarrollo-y-pruebas.md)                 | Flujo local, CI y aceptación               | Aprobado para v1 |
| [09 — Operación y observabilidad](09-operacion-y-observabilidad.md)     | Salud, logs, límites e incidencias         | Aprobado para v1 |
| [10 — Identidad visual](10-identidad-visual.md)                         | Icono, favicon, paleta y uso de marca      | Aprobado para v1 |

## Decisiones de arquitectura

- [ADR-001 — Servicio único en Railway](decisions/001-servicio-unico-en-railway.md)
- [ADR-002 — Opus y volumen individual](decisions/002-audio-opus-y-volumen.md)
- [ADR-003 — Límites de YouTube y Spotify](decisions/003-limitaciones-de-youtube-y-spotify.md)

## Referencias operativas

- [Infraestructura como código de Railway](../.railway/README.md)
- [Historial de cambios](../CHANGELOG.md)
- [Política de seguridad](../SECURITY.md)
- [Licencia MIT](../LICENSE)
