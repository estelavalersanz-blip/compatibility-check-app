# Assets de marca (AfinIA)

Fuente original: carpeta de descargas de Estela (SVG exportados de Illustrator). Se guardan aquí como
archivos sueltos, pendientes de copiarse a `apps/frontend` (que ya existe, scaffold completo en la
sección 1 de `openspec/changes/build-compatibility-mvp/tasks.md`): el favicon irá en
`apps/frontend/public/` (sustituyendo al `favicon.ico` por defecto de Angular CLI) referenciado desde
`index.html`, y el logo se implementará como el componente `shared/brand-mark` documentado en
`.claude/skills/ui-design-consistency/references/design-tokens.md` (`fill: currentColor`, no un color
fijo) al construir la cabecera/landing (secciones 11 y 11d de `tasks.md`).

| Archivo | Origen (nombre enviado) | Uso |
|---|---|---|
| `afinia-mark-gray.svg` | `LOGO-AFINIA.svg` | Variante de un solo color (#414042), mismo trazado que `afinia-mark-white.svg` a otra escala de `viewBox`. No se usa como componente inline (ver `brand-mark` en `design-tokens.md`, que usa `currentColor` en vez de un fill fijo) — se conserva como referencia de origen. |
| `afinia-mark-white.svg` | `afinia-logo-blanco.svg` | Es el trazado ya documentado como `shared/brand-mark` en `.claude/skills/ui-design-consistency/references/design-tokens.md` (sección "Logo de marca"), con `fill: currentColor` en vez de blanco fijo. |
| `favicon-positivo.svg` | `FAVICON-POSITIVO.svg` | Cuadrado con esquinas redondeadas, fondo blanco + marca con gradiente `#BE1E2D → #FB8500`. Es "Favicon color" en la hoja de pantallas. |
| `favicon-negativo.svg` | `FAVICON-NEGATIVO.svg` | Cuadrado con esquinas redondeadas, fondo con gradiente `#FB8500 → #BE1E2D` + marca en blanco. Es "Favicon negativo" en la hoja de pantallas. |

Pendiente de definir con Estela: en qué tamaños exportar el favicon a PNG/ICO (16/32/180/512px) y cuál
de las dos variantes (positivo/negativo) usar como favicon real del navegador — ver preguntas abiertas
en la conversación.
