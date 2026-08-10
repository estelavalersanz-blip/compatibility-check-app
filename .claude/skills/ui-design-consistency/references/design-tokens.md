# Tokens de diseño: color, tipografía y gradientes por peso

Valores exactos — cópialos, no los aproximes ni los reinventes por pantalla.

## Paleta de color

| Token | Hex | Uso |
|---|---|---|
| `$primary` | `#E67E22` | Botones principales, enlaces activos, acentos de marca |
| `$secondary` (o `$primary-dark`) | `#D35400` | Hover/active del primario, iconos/badges de énfasis |
| `$dark` / `$body-color` | `#0D1B2A` | Texto principal, superficies oscuras (nunca negro puro `#000`) |
| `$light` (superficie alterna) | `#FCF3CF` | Fondos suaves de sección, extremo "frío" del gradiente de bloques |

No añadas un quinto color "porque hace falta un verde" sin mirar antes la sección de gradientes más
abajo — los verdes de los bloques 1-2 del cuestionario ya están definidos ahí y son los únicos verdes
que debe haber en la aplicación.

## Tipografía

Familia principal: **Poppins** (Google Fonts, variable weights 400/500/600/700). Alternativas
aceptadas si Poppins no está disponible: `DM Sans` o `Roboto` — elige una para todo el proyecto, no
mezcles varias en la misma build.

En `apps/frontend/src/index.html` (o vía `@angular/google-fonts`/self-hosting si se prefiere no
depender de Google Fonts en producción):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Recompilar Bootstrap con estos tokens (`apps/frontend/src/styles.scss`)

No sobrescribas clases de Bootstrap una a una con CSS a medida — sobrescribe las variables Sass antes
de importar Bootstrap para que todo el sistema de utilidades (`.btn-primary`, `.text-primary`,
`.border-primary`, `.bg-primary-subtle`, `.link-primary`, etc.) se recalcule automáticamente:

```scss
// apps/frontend/src/styles.scss

// 1. Overrides de variables ANTES del import de Bootstrap
$primary:        #E67E22;
$secondary:      #D35400;
$dark:           #0D1B2A;
$light:          #FCF3CF;
$body-color:     $dark;
$font-family-base: "Poppins", "DM Sans", "Roboto", system-ui, sans-serif;

// 2. Import de Bootstrap (usa el paquete npm `bootstrap`, no el CSS precompilado)
@import "bootstrap/scss/bootstrap";

// 3. Bootstrap Icons (fuente de iconos, no depende de las variables de arriba)
@import "bootstrap-icons/font/bootstrap-icons.css";
```

Si en algún momento el proyecto usa el CSS precompilado de Bootstrap en vez de compilar desde Sass
(por ejemplo, para arrancar más rápido antes de configurar el pipeline de Sass), el equivalente
temporal es sobrescribir las custom properties de Bootstrap 5.3+ en `:root` — pero migra a la
compilación Sass en cuanto sea posible, porque los overrides de custom properties no recalculan
automáticamente tonos derivados (`-subtle`, `-emphasis`, etc.):

```css
:root {
  --bs-primary: #E67E22;
  --bs-primary-rgb: 230, 126, 34;
  --bs-secondary: #D35400;
  --bs-secondary-rgb: 211, 84, 0;
  --bs-dark: #0D1B2A;
  --bs-light: #FCF3CF;
  --bs-body-color: #0D1B2A;
  --bs-font-sans-serif: "Poppins", "DM Sans", "Roboto", system-ui, sans-serif;
}
```

## Gradiente de peso de los 6 paneles del cuestionario

Los 6 bloques del cuestionario (`design.md` decisión 6c) tienen pesos 5/5/15/20/25/30%. El color se
asigna **por peso**, no por número de bloque — los bloques 1 y 2 pesan igual (5%) y deben usar
exactamente el mismo gradiente:

| Bloque(s) | Preguntas | Peso | Gradiente (`background`) | Color de texto en el header |
|---|---|---|---|---|
| 1 y 2 | 1-6, 7-12 | 5% | `linear-gradient(135deg, #EAF4E7, #DCEEDA)` | `#0D1B2A` |
| 3 | 13-18 | 15% | `linear-gradient(135deg, #FCF3CF, #F7E7B0)` | `#0D1B2A` |
| 4 | 19-24 | 20% | `linear-gradient(135deg, #F7DCC0, #F3C89A)` | `#0D1B2A` |
| 5 | 25-30 | 25% | `linear-gradient(135deg, #F0B37A, #E67E22)` | `#0D1B2A` (verificar contraste; si falla, `#FFFFFF`) |
| 6 | 31-36 | 30% | `linear-gradient(135deg, #E67E22, #D35400)` | `#FFFFFF` |

Implementación sugerida (clase por peso, no por índice de bloque, para que el código exprese la misma
regla):

```scss
// apps/frontend/src/app/features/questionnaire/questionnaire.component.scss
.question-block--weight-05 { background: linear-gradient(135deg, #EAF4E7, #DCEEDA); color: #0D1B2A; }
.question-block--weight-15 { background: linear-gradient(135deg, #FCF3CF, #F7E7B0); color: #0D1B2A; }
.question-block--weight-20 { background: linear-gradient(135deg, #F7DCC0, #F3C89A); color: #0D1B2A; }
.question-block--weight-25 { background: linear-gradient(135deg, #F0B37A, #E67E22); color: #0D1B2A; }
.question-block--weight-30 { background: linear-gradient(135deg, #E67E22, #D35400); color: #FFFFFF; }
```

```html
<!-- ejemplo de asignación de clase por bloque -->
<div class="accordion-item question-block"
     [ngClass]="'question-block--weight-' + (block.weightPercent | number:'2.0-0')">
  ...
</div>
```

Antes de dar por buena la implementación, comprueba el contraste texto/fondo de cada panel (objetivo
WCAG AA, ratio ≥ 4.5:1 para texto normal) — los valores de la tabla ya están pensados para cumplirlo,
pero si cambias algún tono, vuelve a comprobarlo en vez de asumirlo.

## Transición entre preguntas (pestañas dentro de un bloque)

Cada bloque muestra sus 6 preguntas como pestañas (`NgbNav`), una pregunta a la vez. Al cambiar de
pestaña, el contenido nuevo entra con esta transición — no un cambio instantáneo ni una animación más
larga/llamativa:

- Duración: `200ms`
- Easing: `ease-out`
- Efecto: fade + desplazamiento horizontal corto (`opacity 0→1`, `translateX(8px)→0`)
- Con `prefers-reduced-motion: reduce`, se elimina el desplazamiento y el fade se hace instantáneo (el
  cambio de pestaña sigue funcionando, solo sin la animación)

```scss
// apps/frontend/src/app/features/questionnaire/questionnaire.component.scss
@keyframes question-pane-in {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}

.question-pane {
  animation: question-pane-in 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .question-pane {
    animation: none;
  }
}
```

Como cada cambio de pestaña de `ngbNavOutlet` renderiza un nodo nuevo para el panel activo, basta con
que `.question-pane` tenga esta animación declarada — no hace falta orquestarla manualmente desde el
componente TypeScript.
