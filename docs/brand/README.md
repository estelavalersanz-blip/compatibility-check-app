# Assets de marca (AfinIA)

Fuente original: carpeta de descargas de Estela (SVG exportados de Illustrator). Se guardan aquí como
archivos sueltos porque `apps/frontend` todavía no existe (ver tareas 1.x de
`openspec/changes/build-compatibility-mvp/tasks.md`); cuando se cree el scaffold de Angular, estos
archivos se copian a `apps/frontend/src/assets/brand/` y el favicon se referencia desde `angular.json`
(`projects.<app>.architect.build.options.assets`) y `index.html`.

| Archivo | Origen (nombre enviado) | Uso |
|---|---|---|
| `afinia-mark-gray.svg` | `LOGO-AFINIA.svg` | Variante de un solo color (#414042), mismo trazado que `afinia-mark-white.svg` a otra escala de `viewBox`. No se usa como componente inline (ver `brand-mark` en `design-tokens.md`, que usa `currentColor` en vez de un fill fijo) — se conserva como referencia de origen. |
| `afinia-mark-white.svg` | `afinia-logo-blanco.svg` | Es el trazado ya documentado como `shared/brand-mark` en `.claude/skills/ui-design-consistency/references/design-tokens.md` (sección "Logo de marca"), con `fill: currentColor` en vez de blanco fijo. |
| `favicon-positivo.svg` | `FAVICON-POSITIVO.svg` | Cuadrado con esquinas redondeadas, fondo blanco + marca con gradiente `#BE1E2D → #FB8500`. Es "Favicon color" en la hoja de pantallas. |
| `favicon-negativo.svg` | `FAVICON-NEGATIVO.svg` | Cuadrado con esquinas redondeadas, fondo con gradiente `#FB8500 → #BE1E2D` + marca en blanco. Es "Favicon negativo" en la hoja de pantallas. |

Pendiente de definir con Estela: en qué tamaños exportar el favicon a PNG/ICO (16/32/180/512px) y cuál
de las dos variantes (positivo/negativo) usar como favicon real del navegador — ver preguntas abiertas
en la conversación.
