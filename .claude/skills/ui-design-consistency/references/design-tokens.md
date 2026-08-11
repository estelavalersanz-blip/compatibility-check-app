# Tokens de diseño: color, logo, tipografía y wizard del cuestionario

Valores exactos — cópialos, no los aproximes ni los reinventes por pantalla.

## Paleta de color

| Token | Hex | Uso |
|---|---|---|
| `$primary` | `#FB8500` (Princeton Orange) | Botones principales, enlaces activos, acentos de marca, insignia de bloque completado |
| `$secondary` | `#BE1E2D` (Carmine) | Hover/active del primario, icono de racha, extremo más intenso del gradiente de bloques. **No lo mapees a `btn-outline-secondary`/logout** — ver `SKILL.md` |
| `$dark` / `$body-color` | `#000000` (negro) | Texto principal, superficies oscuras, extremo del gradiente del bloque más pesado |
| `$light` (superficie alterna) | `#FDF0D5` (Papaya Whip) | Fondos suaves de sección, extremo "frío" del gradiente de bloques |
| — (sin variable Sass dedicada, es el blanco base de Bootstrap) | `#FFFFFF` | Fondo de cards/superficies claras, otro extremo frío del mismo gradiente |

No añadas un sexto color sin mirar antes la sección de la barra ponderada más abajo — los tonos
intermedios que aparecen ahí (`#FCD9A0`, `#DD5217`) son variaciones tonales derivadas de los 5 colores
base para lograr una transición gradual, no colores nuevos independientes.

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
$primary:        #FB8500;
$secondary:      #BE1E2D;
$dark:           #000000;
$light:          #FDF0D5;
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
  --bs-primary: #FB8500;
  --bs-primary-rgb: 251, 133, 0;
  --bs-secondary: #BE1E2D;
  --bs-secondary-rgb: 190, 30, 45;
  --bs-dark: #000000;
  --bs-light: #FDF0D5;
  --bs-body-color: #000000;
  --bs-font-sans-serif: "Poppins", "DM Sans", "Roboto", system-ui, sans-serif;
}
```

## Logo de marca (AfinIA)

Marca abstracta de un solo color, 5 `<path>`, `viewBox="0 0 345.3 336.08"`. Cópialo tal cual como
componente compartido (`shared/brand-mark`) — no lo redibujes ni le añadas un `fill` fijo a los
`<path>`: el color lo pone el CSS del contenedor.

```html
<!-- apps/frontend/src/app/shared/brand-mark/brand-mark.component.html -->
<svg viewBox="0 0 345.3 336.08" class="brand-mark" aria-hidden="true" focusable="false">
  <path d="M267.83,175.64c-19.09,25.81-46.83,52.24-71.15,73.34-31.85,27.64-101.3,82.56-142.99,86.01-41.43,3.42-63.46-26.52-49.5-65.5,9.91-27.69,29.75-63.59,43.16-90.84,1.28-2.61,8.11-17.06,9.37-17.63l14.3,19.67,2.01,5.58c-11.47,26.61-25.74,52.03-37.67,78.39-4.64,10.26-12.58,23.75-7.2,34.9,3.89,8.07,12.23,9.8,20.52,9.45,39.12-1.67,121.5-69.78,150.54-97.48,23.76-22.67,67.2-67,70.74-100.28,1.69-15.92-16.82-36.45-20.75-52.23,26.33,2.81,44.81,19.6,46.87,46.62,1.77,23.18-14.82,51.85-28.25,70.01Z"/>
  <path d="M195.78,259.55c1.84-1.27,1.12-2.64,5.38-1,4.84,1.86,15.03,11.19,20.32,14.67,18.45,12.14,54.36,35.73,76.22,35.57,18.35-.14,23.42-12.82,17.96-28.75l-44.45-93.64c-.61-6,13.39-19.49,16.49-25.38,2.47,0,19.13,39.11,21.64,44.34,10.42,21.65,36.13,64.74,35.94,87.14-.2,24.04-21.77,43.81-45.6,43.58-30.41-.29-70.28-25.17-94.8-42.26-6.22-4.34-18.86-12.48-23.7-17.3-.96-.95-2.8-1.99-1.52-3.54,5.91-3.49,10.63-9.65,16.11-13.43Z"/>
  <path d="M167.98.28c39.58-4,60.4,35.73,75.08,65.36,5.16,10.4,12.14,24.14,16.32,34.68,1.35,3.41,3.14,7.26,2.63,10.92-1.33,9.47-6.77,20.93-12.31,28.74-16.01-27.04-26.17-58.74-42.33-85.65-25.02-41.69-51.73-33.27-73.34,5-14.5,25.68-24.6,55.05-39.33,80.65-2.35.06-15.15-28.3-12.27-33.23C101.83,70.2,118.95,5.24,167.98.28Z"/>
  <path d="M95.2,59.01l-20.76,43.73c-1.06,6.59.39,13.02,2.25,19.28,9.34,31.31,45.49,67.57,68.98,90.02,3.6,3.44,17.4,13.96,19.03,16.98.47.87.89,1.95.36,2.87-4.57,1.61-14.04,13.02-17.58,14-.96.26-1.59.19-2.52-.05-2.02-.5-15.51-13.2-18.29-15.8-28.36-26.46-75.34-76.81-78.35-116.65-2.3-30.46,17.67-50.59,46.87-54.37Z"/>
  <path d="M164.56,109.65c-3.25-2.85-6.38-6.73-10.02-9.48-7.55-5.69-16.08-9.2-24.3-13.73-.27-1.17,8.96-20.42,10.43-21.55,1.92-1.47,10.21,3.37,12.56,4.59,6.7,3.49,12.68,8.26,19.5,11.51,4.76-3.4,26.84-18.5,31.49-15.53,1.79,1.14,10.33,20.29,9.56,21.54-15.94,7.32-29.01,16.37-41.52,28.61-.76.19-6.49-4.89-7.7-5.96Z"/>
</svg>
```

```scss
// apps/frontend/src/app/shared/brand-mark/brand-mark.component.scss
.brand-mark {
  fill: currentColor; // hereda el color de texto del contenedor — nunca un color fijo aquí
  width: 28px;
  height: 28px;
}

// Shell B (card de autenticación): el logo lleva el color de marca, no el de texto
.brand-mark--accent {
  color: $primary;
  width: 48px;
  height: 48px;
}
```

## Barra de progreso ponderada del wizard del cuestionario

Los 6 bloques del cuestionario (`design.md` decisión 6c) tienen pesos 5/5/15/20/25/30%. En el wizard,
esto se representa como **6 segmentos en línea con ancho proporcional al peso** (no una barra plana de
"respondidas/36"). El color de cada segmento se asigna **por peso**, no por número de bloque — los
bloques 1 y 2 pesan igual (5%) y deben usar exactamente el mismo gradiente:

| Bloque(s) | Preguntas | Peso | Ancho del segmento | Gradiente de relleno (`background`) | Texto en el `card-header` de ese paso |
|---|---|---|---|---|---|
| 1 y 2 | 1-6, 7-12 | 5% | 5% del ancho total | `linear-gradient(135deg, #FFFFFF, #FDF0D5)` | `#000000` |
| 3 | 13-18 | 15% | 15% del ancho total | `linear-gradient(135deg, #FDF0D5, #FCD9A0)` | `#000000` |
| 4 | 19-24 | 20% | 20% del ancho total | `linear-gradient(135deg, #FCD9A0, #FB8500)` | `#000000` |
| 5 | 25-30 | 25% | 25% del ancho total | `linear-gradient(135deg, #FB8500, #DD5217)` | `#000000` |
| 6 | 31-36 | 30% | 30% del ancho total | `linear-gradient(135deg, #BE1E2D, #000000)` | `#FFFFFF` |

Todos los pares de la tabla están comprobados a mano en WCAG AA (ratio ≥ 4.5:1 para texto normal) con
el color de texto indicado — si cambias algún tono, vuelve a comprobar el contraste en vez de asumirlo.

Los segmentos de bloques ya visitados son clicables para saltar directamente a revisarlos/editarlos —
solo hasta `maxReachedBlockIndex` (el bloque más avanzado alcanzado), nunca por delante de él:

```html
<!-- apps/frontend/src/app/features/questionnaire/questionnaire.component.html -->
<div class="quest-progress" role="progressbar" [attr.aria-valuenow]="answeredCount"
     aria-valuemin="0" aria-valuemax="36" [attr.aria-label]="answeredCount + ' de 36 respondidas'">
  @for (block of blocks(); track block.id; let bi = $index) {
    <button type="button"
            class="quest-progress__segment"
            [ngClass]="'quest-progress__segment--weight-' + block.weightPercent"
            [disabled]="bi > maxReachedBlockIndex()"
            [attr.aria-label]="'Ir al bloque ' + (bi + 1)"
            (click)="goToBlock(bi)">
      <div class="quest-progress__fill" [style.width.%]="(block.answeredCount / 6) * 100"></div>
      @if (block.answeredCount === 6 && bi < currentBlockIndex()) {
        <i class="bi bi-check-lg quest-progress__check"></i>
      }
    </button>
  }
</div>
```

```ts
// apps/frontend/src/app/features/questionnaire/questionnaire.component.ts (esquema)
currentBlockIndex = signal(0);
maxReachedBlockIndex = signal(0); // solo avanza, nunca retrocede al revisar

goToBlock(index: number): void {
  if (index <= this.maxReachedBlockIndex()) {
    this.currentBlockIndex.set(index); // revisar/editar un bloque ya visitado
  }
}

nextBlock(): void {
  if (this.currentBlockIndex() < this.maxReachedBlockIndex()) {
    this.currentBlockIndex.set(this.maxReachedBlockIndex()); // "Volver a donde estabas"
  } else {
    const next = this.currentBlockIndex() + 1;
    this.currentBlockIndex.set(next);
    this.maxReachedBlockIndex.set(next); // avanzar de verdad sí mueve el máximo alcanzado
  }
}
```

```scss
// apps/frontend/src/app/features/questionnaire/questionnaire.component.scss
.quest-progress {
  display: flex;
  gap: 3px;
  height: 10px;
}
.quest-progress__segment {
  position: relative;
  background: var(--bs-border-color);
  border-radius: 4px;
  overflow: hidden;
  border: none; // es un <button>, no un <div> — resetea el estilo nativo
  padding: 0;
  cursor: pointer;
}
.quest-progress__segment:disabled {
  cursor: default; // bloques aún no alcanzados: no clicables, pero sin look "deshabilitado" gris
}
.quest-progress__segment:not(:disabled):hover {
  filter: brightness(0.92); // feedback de que ese tramo se puede revisar
}
.quest-progress__segment:focus-visible {
  outline: 2px solid $dark;
  outline-offset: 2px;
}
.quest-progress__segment--weight-05 { flex: 5; }
.quest-progress__segment--weight-15 { flex: 15; }
.quest-progress__segment--weight-20 { flex: 20; }
.quest-progress__segment--weight-25 { flex: 25; }
.quest-progress__segment--weight-30 { flex: 30; }

.quest-progress__fill {
  position: absolute;
  inset: 0;
  width: 0%;
  transition: width 260ms ease-out;
}
.quest-progress__segment--weight-05 .quest-progress__fill { background: linear-gradient(90deg, #FFFFFF, #FDF0D5); }
.quest-progress__segment--weight-15 .quest-progress__fill { background: linear-gradient(90deg, #FDF0D5, #FCD9A0); }
.quest-progress__segment--weight-20 .quest-progress__fill { background: linear-gradient(90deg, #FCD9A0, #FB8500); }
.quest-progress__segment--weight-25 .quest-progress__fill { background: linear-gradient(90deg, #FB8500, #DD5217); }
.quest-progress__segment--weight-30 .quest-progress__fill { background: linear-gradient(90deg, #BE1E2D, #000000); }

.quest-progress__check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: #FFFFFF;
}

@media (prefers-reduced-motion: reduce) {
  .quest-progress__fill { transition: none; }
}
```

El mismo gradiente de la fila del bloque activo colorea el `card-header` de su paso (título del bloque
+ insignia si está completo):

```html
<div class="card">
  <div class="card-header question-block" [ngClass]="'question-block--weight-' + activeBlock().weightPercent">
    <div class="d-flex align-items-center gap-2">
      <span class="fw-semibold">Bloque {{ activeBlock().id }}</span>
      <i class="bi bi-award-fill block-badge" *ngIf="activeBlock().answeredCount === 6" aria-hidden="true"></i>
    </div>
  </div>
  <div class="card-body">
    <!-- pestañas + textarea, ver "Transición entre preguntas" más abajo -->
  </div>
  <div class="card-footer bg-white d-flex justify-content-end">
    <button type="button" class="btn btn-primary" (click)="nextBlock()">
      {{ footerButtonLabel() }}
    </button>
  </div>
</div>
```

`footerButtonLabel()` combina si estás revisando o avanzando (ver `nextBlock()`/`goToBlock()` arriba) con
si es el último bloque:

```ts
footerButtonLabel(): string {
  if (this.currentBlockIndex() < this.maxReachedBlockIndex()) {
    return 'Volver a donde estabas'; // estás revisando un bloque ya superado
  }
  return this.isLastBlock() ? 'Enviar cuestionario' : 'Siguiente bloque';
}
```

```scss
.question-block--weight-05 { background: linear-gradient(135deg, #FFFFFF, #FDF0D5); color: #000000; }
.question-block--weight-15 { background: linear-gradient(135deg, #FDF0D5, #FCD9A0); color: #000000; }
.question-block--weight-20 { background: linear-gradient(135deg, #FCD9A0, #FB8500); color: #000000; }
.question-block--weight-25 { background: linear-gradient(135deg, #FB8500, #DD5217); color: #000000; }
.question-block--weight-30 { background: linear-gradient(135deg, #BE1E2D, #000000); color: #FFFFFF; }
```

## Transición entre preguntas (pestañas dentro del bloque activo)

El bloque activo del wizard muestra sus 6 preguntas como pestañas (`NgbNav`), una pregunta a la vez. Al
cambiar de pestaña, el contenido nuevo entra con esta transición — no un cambio instantáneo ni una
animación más larga/llamativa:

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

## Gamificación del cuestionario: copys y animaciones exactas

Valores exactos para la sección "Gamificación del cuestionario" de `SKILL.md` — no los reformules ni
inventes copys alternativos por pantalla.

### Cabecera del wizard: flecha de volver + barra + racha

```html
<div class="d-flex align-items-center gap-3 mb-1">
  <button type="button" class="btn btn-link p-0 text-body" (click)="previousBlock()"
          [attr.aria-label]="currentBlockIndex() === 0 ? 'Salir del cuestionario' : 'Bloque anterior'">
    <i class="bi bi-arrow-left fs-4"></i>
  </button>
  <div class="flex-grow-1">
    <!-- quest-progress, ver sección de arriba -->
  </div>
  <span class="small text-body-secondary text-nowrap">
    <i class="bi bi-fire text-secondary"></i> {{ streakCount }}
  </span>
</div>
<p class="small text-body-secondary mb-3">{{ progressCopy }}</p>
```

### Copys del texto motivacional (por tramo de respondidas/36)

| Tramo | Copy exacto |
|---|---|
| 0–11 | "Vamos empezando" |
| 12–23 | "Vas por la mitad" |
| 24–35 | "Ya casi" |
| 36/36 | "¡Cuestionario completo!" |

### Insignia de bloque completado (`block-badge-in`)

```scss
@keyframes block-badge-in {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}

.block-badge {
  color: $primary;
  animation: block-badge-in 250ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .block-badge { animation: none; }
}
```

```html
<i class="bi bi-award-fill block-badge" *ngIf="block.answeredCount === 6" aria-hidden="true"></i>
```

### Icono de pestaña al responder (`tab-icon-pop`)

```scss
@keyframes tab-icon-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.tab-icon--answered {
  color: $primary;
  animation: tab-icon-pop 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .tab-icon--answered { animation: none; }
}
```

### Banner de cierre al llegar a 36/36

Aparece en el paso del bloque 6, encima de su card. Reutiliza el gradiente de ese mismo bloque (peso
30%) — no es un color nuevo:

```html
<div class="rounded p-3 mb-3 d-flex align-items-center gap-2 text-white"
     style="background: linear-gradient(135deg, #BE1E2D, #000000);"
     *ngIf="answeredCount === 36">
  <i class="bi bi-stars fs-4"></i>
  <span>¡Cuestionario completo! Ya puedes enviarlo.</span>
</div>
```

Este banner es informativo: no sustituye ni deshabilita el botón real de envío del `card-footer`.

## Cards seleccionables: cualidades (diseño del check y tope de 5)

La estructura sigue siendo la **card** original en grid (decisión 3d de `design.md`) — no se cambia por
chips ni píldoras. Dos reglas de comportamiento, no solo de estilo:

1. **Diseño del check**: en vez de un `bi-check-circle-fill` inline junto a la etiqueta, la card
   seleccionada muestra una insignia circular superpuesta en su esquina, con la misma animación de
   entrada que la insignia de bloque del cuestionario (mismo lenguaje visual para "esto queda
   marcado/elegido" en toda la app).
2. **Tope de 5 en la propia interacción**: al llegar a 5 cualidades marcadas, las cards **no**
   seleccionadas quedan `disabled` — no se puede marcar una sexta hasta desmarcar alguna de las 5.
   Desmarcar nunca se bloquea. Esto es distinto (y más estricto) del bloqueo de envío: aquí se impide la
   propia acción de marcar, no solo el botón de guardar.

Marcado exacto para el componente compartido `shared/quality-card`, usado en registro paso 2 y en
configuración (ver `SKILL.md`, sección "Sistema de botones, iconos y formularios"):

```html
<!-- apps/frontend/src/app/shared/quality-card/quality-card.component.html -->
<button
  type="button"
  class="card quality-card h-100 text-start"
  [class.border-primary]="selected"
  [class.bg-primary-subtle]="selected"
  [attr.aria-pressed]="selected"
  [disabled]="!selected && selectedCount >= 5"
  (click)="toggle.emit()">
  <div class="card-body py-2 px-3 d-flex align-items-center">
    <span>{{ label }}</span>
  </div>
  @if (selected) {
    <span class="quality-card__check" aria-hidden="true">
      <i class="bi bi-check-lg"></i>
    </span>
  }
</button>
```

`selectedCount` se pasa desde el contenedor (número de cualidades ya marcadas en todo el grid, no un
estado propio de cada card individual):

```html
<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-2">
  @for (quality of qualities(); track quality.id) {
    <div class="col">
      <app-quality-card
        [label]="quality.label"
        [selected]="quality.selected"
        [selectedCount]="selectedCount()"
        (toggle)="onToggle(quality)" />
    </div>
  }
</div>
```

```scss
// apps/frontend/src/app/shared/quality-card/quality-card.component.scss
.quality-card {
  position: relative; // necesario para que la insignia se posicione respecto a la card
}

.quality-card__check {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: $primary;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  animation: quality-check-in 200ms ease-out;
}

@keyframes quality-check-in {
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .quality-card__check { animation: none; }
}
```

## Chat interno: botón de la card, listado y burbujas de mensaje

Valores exactos para la sección "Chat interno" de `SKILL.md` (capability `internal-chat`, ver `design.md`
decisión 9).

### Botón "Chatear" en la card del dashboard

```html
<!-- dentro del card-footer de cada card de features/results-dashboard -->
<button type="button" class="btn btn-primary btn-sm" (click)="startChat(comparison.candidateUserId)">
  <i class="bi bi-chat-dots"></i> Chatear
</button>
```

```ts
// startChat() — idempotente: el backend crea o reutiliza, la UI no decide
startChat(candidateUserId: string): void {
  this.chatService.startConversation(candidateUserId).subscribe(conversation => {
    this.router.navigate(['/chats', conversation.id]);
  });
}
```

### Listado de conversaciones (`features/chats`)

```html
<!-- apps/frontend/src/app/features/chats/chats.component.html -->
<h1 class="h3 mb-1">Chats</h1>
<p class="text-body-secondary mb-4">Tus conversaciones con perfiles con los que ha habido compatibilidad.</p>

<div class="card">
  <div class="card-body p-0">
    <div class="list-group list-group-flush">
      @for (conversation of conversations(); track conversation.id) {
        <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-3"
                routerLink="/chats/{{ conversation.id }}">
          <img [src]="conversation.otherParticipant.photoUrl" class="rounded-circle" width="40" height="40" alt="">
          <div class="flex-grow-1 text-start overflow-hidden">
            <div class="fw-semibold">{{ conversation.otherParticipant.alias }}</div>
            <div class="text-body-secondary text-truncate small">{{ conversation.lastMessage?.body }}</div>
          </div>
          @if (conversation.unreadCount > 0) {
            <span class="badge rounded-pill bg-secondary">{{ conversation.unreadCount }}</span>
          }
        </button>
      }
    </div>
  </div>
</div>
```

Sin `card-footer`: el listado no tiene una acción "principal" propia, cada fila navega a su conversación.

### Conversación (`features/chats/:id`) — burbujas de mensaje

```html
<!-- apps/frontend/src/app/features/chats/chat-conversation.component.html -->
<div class="card">
  <div class="card-header d-flex align-items-center gap-2">
    <button type="button" class="btn btn-link p-0 text-body" routerLink="/chats">
      <i class="bi bi-arrow-left fs-4"></i>
    </button>
    <img [src]="conversation().otherParticipant.photoUrl" class="rounded-circle" width="32" height="32" alt="">
    <span class="fw-semibold">{{ conversation().otherParticipant.alias }}</span>
  </div>
  <div class="card-body chat-messages" #scrollAnchor>
    @for (message of messages(); track message.id) {
      <div class="chat-message" [class.chat-message--mine]="message.senderId === myUserId()">
        <div class="chat-message__bubble">{{ message.body }}</div>
        <div class="chat-message__time">{{ message.createdAt | date:'shortTime' }}</div>
      </div>
    }
  </div>
  <div class="card-footer bg-white d-flex gap-2">
    <input class="form-control" [(ngModel)]="draftMessage" (keyup.enter)="send()" placeholder="Escribe un mensaje…">
    <button type="button" class="btn btn-primary" (click)="send()" [disabled]="!draftMessage.trim()">
      <i class="bi bi-send"></i>
    </button>
  </div>
</div>
```

```scss
// apps/frontend/src/app/features/chats/chat-conversation.component.scss
.chat-messages {
  height: 60vh;       // altura fija en CSS, nunca 100vh a pelo (deja sitio a navbar/header/footer)
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chat-message {
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

.chat-message__bubble {
  max-width: 75%;
  padding: 0.5rem 0.85rem;
  border-radius: 14px;
  background: $light;      // Papaya Whip — mensajes del otro participante
  color: $dark;
  align-self: flex-start;
  overflow-wrap: break-word;  // nunca desborda el ancho de la card con una palabra larga/URL
}

.chat-message__time {
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
  margin-top: 2px;
}

.chat-message--mine {
  align-items: flex-end;
}

.chat-message--mine .chat-message__bubble {
  background: $primary;
  color: #FFFFFF;
  align-self: flex-end;
}
```

El scroll al último mensaje (al entrar o al llegar uno nuevo por sondeo) se hace con
`scrollAnchor.nativeElement.scrollTop = scrollAnchor.nativeElement.scrollHeight` tras cada actualización
de `messages()` — no con `scrollIntoView` en cada burbuja individual (más caro y menos predecible con
listas largas).
