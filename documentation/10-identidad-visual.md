# Identidad visual

## Recurso principal

El icono oficial de Lucio está versionado en `web/public/assets/lucio-icon.jpg`. La misma imagen se utiliza en la cabecera, la pantalla de acceso, el estado vacío del reproductor y como favicon. El archivo fuente es cuadrado, de 512 × 512 píxeles y combina una mascota blanca con auriculares sobre un degradado verde.

El avatar de la aplicación de Discord se administra desde el Developer Portal; el recurso versionado es su fuente de verdad, pero el despliegue web no modifica automáticamente el avatar externo.

## Paleta

La paleta se extrajo de los colores dominantes del icono y se declara mediante variables CSS.

| Token             | Valor     | Uso                                    |
| ----------------- | --------- | -------------------------------------- |
| `--lime`          | `#88e828` | Acción principal, foco y progreso      |
| `--lime-soft`     | `#b6fa73` | Hover de acciones principales          |
| `--green`         | `#5caf21` | Gradientes y estados activos           |
| `--deep`          | `#080d06` | Fondo principal y texto sobre lima     |
| `--surface`       | `#10180d` | Entradas y superficies                 |
| `--raised`        | `#172212` | Superficies elevadas                   |
| `--raised-2`      | `#1c2916` | Controles y superficies interactivas   |
| `--border`        | `#2b4021` | Bordes y separadores                   |
| `--border-bright` | `#466532` | Contornos destacados                   |
| `--text`          | `#f7faf5` | Texto principal y blanco de la mascota |

Los verdes de marca se reservan para acciones, estados y acentos; los textos secundarios usan tonos desaturados para conservar jerarquía y contraste.

Las capturas del tutorial comparten estas variables y se renderizan desde componentes de la propia web. Así conservan tipografía, espaciado, iconografía y color sin introducir una segunda identidad visual.

La interfaz utiliza una pila tipográfica del sistema y SVG propios. No descarga fuentes ni paquetes de iconos de terceros, reduciendo latencia, transferencia y exposición a servicios externos.
