# ADR-002: Opus y volumen individual

**Estado:** aceptado.

Se prioriza passthrough Opus porque reduce CPU y evita pérdidas de una segunda codificación. Lucio no ofrece volumen global; cada usuario usa el control individual de Discord. FFmpeg a 128 kbps es únicamente el fallback para formatos incompatibles.
