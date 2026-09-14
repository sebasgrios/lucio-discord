# ADR-001: servicio único en Railway

**Estado:** aceptado.

El prototipo ejecuta Discord, HTTP, panel y audio en un contenedor para caber en Railway Free. Los módulos se comunican mediante contratos internos para poder separar el audio cuando exista presupuesto. Se acepta menor aislamiento a cambio de coste cero durante la validación.
