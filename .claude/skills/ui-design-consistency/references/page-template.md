# Plantilla de partida para una pantalla nueva

Copia el bloque que corresponda según en qué shell vive la pantalla nueva (ver `SKILL.md`), y sustituye
los comentarios `<!-- ... -->` por el contenido real de la feature. No cambies la jerarquía de
`container`/`card`/`card-body`/`card-footer` salvo que la sección "Casos especiales" de abajo lo
justifique.

## Pantalla autenticada (dentro de Shell A / `core/shell`)

```html
<!-- apps/frontend/src/app/features/<feature>/<feature>.component.html -->
<h1 class="h3 mb-1"><!-- Título de la pantalla --></h1>
<p class="text-body-secondary mb-4"><!-- Subtítulo/explicación breve, opcional --></p>

@if (loading()) {
  <div class="d-flex justify-content-center py-5">
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando…</span>
    </div>
  </div>
} @else if (error()) {
  <div class="alert alert-danger d-flex align-items-center gap-2" role="alert">
    <i class="bi bi-exclamation-triangle"></i>
    <span><!-- mensaje de error --></span>
  </div>
} @else if (isEmpty()) {
  <div class="alert alert-warning d-flex align-items-center gap-2" role="alert">
    <i class="bi bi-info-circle"></i>
    <span><!-- mensaje de estado vacío --></span>
  </div>
} @else {
  <div class="card">
    <div class="card-body">
      <!-- contenido principal: formulario, stepper, detalle, etc. -->
    </div>
    <div class="card-footer bg-white d-flex justify-content-end gap-2">
      <!-- botón secundario si aplica -->
      <button type="button" class="btn btn-dark" (click)="onSubmit()">
        <!-- texto de la acción principal -->
      </button>
    </div>
  </div>
}
```

## Pantalla pública de autenticación (Shell B — fondo degradado)

```html
<!-- apps/frontend/src/app/features/auth/<pantalla>/<pantalla>.component.html -->
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-2" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true">
    <!-- ver references/design-tokens.md -->
  </svg>
  <!-- Solo en login: <h1 class="h3 text-white mb-4">AfinIA</h1>; el resto muestra su propio título -->

  <form class="w-100 text-start" style="max-width: 360px;" [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="mb-3">
      <label class="form-label" for="email">Email</label>
      <input
        id="email"
        type="email"
        class="form-control"
        formControlName="email"
        [class.is-invalid]="form.controls.email.invalid && form.controls.email.touched">
      <div class="invalid-feedback">Introduce un email válido.</div>
    </div>

    <!-- resto de campos siguiendo el mismo patrón -->

    @if (submitError()) {
      <div class="alert alert-danger py-2" role="alert">{{ submitError() }}</div>
    }

    <button type="submit" class="btn btn-dark w-100 mb-3" [disabled]="form.invalid || submitting()">
      <!-- texto de la acción principal -->
    </button>
  </form>

  <!-- enlaces secundarios (p. ej. "¿olvidaste tu contraseña?") en blanco, ver design-tokens.md -->
</div>
```

## Grid de tarjetas (solo `results-dashboard`)

```html
<div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
  @for (comparison of comparisons(); track comparison.id) {
    <div class="col">
      <div class="card h-100">
        <div class="card-body">
          <!-- foto, alias, score general, radar/barras de las 6 dimensiones -->
          <!-- NUNCA el texto de las respuestas — ni las propias ni las del candidato -->
        </div>
        @if (comparison.expanded) {
          <!-- detalle opcional: pregunta + sus puntuaciones + explicación de la IA.
               Sigue sin incluir respuesta_usuario_1/respuesta_usuario_2. -->
        }
        <div class="card-footer bg-white">
          <!-- botón de expandir detalle -->
        </div>
      </div>
    </div>
  }
</div>
```

## Píldoras seleccionables de cualidades — componente compartido

Píldoras (`rounded-pill`) en fila, no cards — cambio de color al seleccionar (fondo `$primary`, texto
blanco), sin icono superpuesto. Al llegar a 5 marcadas, las no seleccionadas se deshabilitan — no se
puede marcar una sexta. Ver `design-tokens.md` para el marcado y CSS completos (`shared/quality-pill`).
No copiar en `features/registration` y `features/settings` por separado — es un componente compartido:

```html
<div class="d-flex flex-wrap gap-2">
  @for (quality of qualities(); track quality.id) {
    <app-quality-pill
      [label]="quality.label"
      [selected]="quality.selected"
      [selectedCount]="selectedCount()"
      (toggled)="onToggle(quality)" />
  }
</div>
```

## Cuestionario: wizard de 6 pasos (un bloque por pantalla)

Ver `SKILL.md` y `design-tokens.md` para la regla completa. **No renderices los 6 bloques a la vez** —
solo la card del bloque activo. `currentBlockIndex`/`maxReachedBlockIndex` distinguen "qué bloque estoy
viendo" de "hasta dónde he llegado", para poder volver a revisar/editar cualquier bloque ya visitado sin
perder el sitio donde ibas — ver `goToBlock()`/`nextBlock()` en `design-tokens.md`. La clase
`question-block--weight-XX` y las clases `quest-progress__*` salen de `design-tokens.md`, no las
inventes aquí:

```html
<!-- apps/frontend/src/app/features/questionnaire/questionnaire.component.html -->
<div class="d-flex align-items-center gap-3 mb-1">
  <button type="button" class="btn btn-link p-0 text-body" (click)="previousBlock()"
          [attr.aria-label]="currentBlockIndex() === 0 ? 'Salir del cuestionario' : 'Bloque anterior'">
    <i class="bi bi-arrow-left fs-4"></i>
  </button>
  <div class="flex-grow-1">
    <!-- quest-progress: 6 segmentos por peso, clicables hasta maxReachedBlockIndex, ver design-tokens.md -->
  </div>
  <span class="small text-body-secondary text-nowrap">
    <i class="bi bi-fire text-secondary"></i> {{ streakCount }}
  </span>
</div>
<p class="small text-body-secondary mb-3">{{ progressCopy }}</p>

@if (answeredCount() === 36) {
  <!-- banner de cierre, ver design-tokens.md -->
}

<div class="card">
  <div class="card-header question-block" [ngClass]="'question-block--weight-' + activeBlock().weightPercent">
    <div class="d-flex align-items-center gap-2">
      <span class="fw-semibold">Bloque {{ activeBlock().id }}</span>
      @if (activeBlock().answeredCount === 6) {
        <i class="bi bi-award-fill block-badge" aria-hidden="true"></i>
      }
    </div>
  </div>
  <div class="card-body">
    <!-- una sola pregunta a pantalla completa (ya no pestañas NgbNav) -->
    <div class="question-pane">
      <label class="form-label">{{ activeQuestion().text }}</label>
      <!-- w-100 + rows="4": ocupa todo el ancho de la card y muestra al menos 4 líneas -->
      <textarea
        class="form-control w-100"
        rows="4"
        [(ngModel)]="activeQuestion().answer"
        (blur)="saveDraft()"></textarea>
    </div>
    <!-- navegación de puntos + flechas entre las 6 preguntas del bloque, ver design-tokens.md -->
    <app-question-nav
      [questions]="activeBlock().questions"
      [currentIndex]="currentQuestionIndex()"
      [maxReachedIndex]="maxReachedQuestionIndex()"
      (indexChange)="goToQuestion($event)" />
  </div>
  <div class="card-footer bg-white d-flex justify-content-end">
    <button type="button" class="btn btn-dark" (click)="nextBlock()">
      {{ footerButtonLabel() }}
    </button>
  </div>
</div>
```

## Casos especiales (excepciones ya justificadas — no añadas más sin documentarlas aquí)

- **`results-dashboard`**: usa un grid de cards en vez de una única card, porque muestra hasta 3
  comparaciones en paralelo (ver `SKILL.md`).
- **`features/questionnaire`**: la card de arriba (`card-header` + `card-body` + `card-footer`) sigue el
  patrón container+card estándar, pero va precedida de la cabecera de wizard (flecha + barra ponderada +
  racha) en vez de un `<h1>`/subtítulo simple, y solo se monta el bloque activo — nunca los 6 a la vez.
- **`features/chats/:id`** (conversación de chat): el `card-body` no es un formulario ni contenido
  estático, es la lista de mensajes con scroll propio (altura fija, `overflow-y: auto`); el
  `card-footer` es el único formulario real de la pantalla (input de texto + botón de enviar). Ver
  `design-tokens.md` para el marcado y CSS completos de las burbujas.
- **`features/settings`** (sección 17): 3 cards apiladas (`.mb-4` entre ellas), no una sola — "perfil"
  (foto/nombre/alias/cualidades), "cambiar contraseña" y "tu cuestionario" (resumen + navegación a
  `/questionnaire?mode=edit`) son 3 acciones de guardado independientes, cada una con su propio
  `card-footer`/botón/estado de error, a diferencia del resto de pantallas de Shell A que editan una
  única entidad de una vez. El picker de foto y las píldoras de cualidad reutilizan el mismo marcado
  que `features/registration` (paso 1/paso 2), pero aquí en un solo formulario, sin wizard — y la foto
  es opcional (si no se toca, se conserva la ya guardada), a diferencia del registro donde es
  obligatoria.
