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
      <button type="button" class="btn btn-primary" (click)="onSubmit()">
        <!-- texto de la acción principal -->
      </button>
    </div>
  </div>
}
```

## Pantalla pública de autenticación (Shell B)

```html
<!-- apps/frontend/src/app/features/auth/<pantalla>/<pantalla>.component.html -->
<div class="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
  <div class="card shadow-sm" style="max-width: 420px; width: 100%;">
    <div class="card-body p-4">
      <h1 class="h4 text-center mb-4">Compatibility Check</h1>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
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

        <button type="submit" class="btn btn-primary w-100" [disabled]="form.invalid || submitting()">
          <!-- texto de la acción principal -->
        </button>
      </form>

      <!-- enlaces secundarios (p. ej. "¿olvidaste tu contraseña?") como btn btn-link, centrados -->
    </div>
  </div>
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

## Cards seleccionables (cualidades) — componente compartido

Este marcado debe vivir en un componente reutilizable (`shared/quality-card` o similar), no copiarse en
`features/registration` y `features/settings` por separado:

```html
<button
  type="button"
  class="card h-100 text-start"
  [class.border-primary]="selected"
  [class.bg-primary-subtle]="selected"
  [attr.aria-pressed]="selected"
  (click)="toggle.emit()">
  <div class="card-body py-2 px-3 d-flex align-items-center gap-2">
    @if (selected) { <i class="bi bi-check-circle-fill text-primary"></i> }
    <span>{{ label }}</span>
  </div>
</button>
```

## Cuestionario: 6 paneles colapsables con gradiente de peso

Ver `SKILL.md` y `design-tokens.md` para la regla completa y la tabla de colores. La clase
`question-block--weight-XX` sale de `design-tokens.md`, no la inventes aquí:

```html
<!-- apps/frontend/src/app/features/questionnaire/questionnaire.component.html -->
<h1 class="h3 mb-1">Cuestionario de compatibilidad</h1>
<p class="text-body-secondary mb-4">
  Responde a las 36 preguntas agrupadas en 6 bloques. Los bloques finales pesan más en tu resultado.
</p>

<div ngbAccordion [closeOthers]="false">
  @for (block of blocks(); track block.id) {
    <div ngbAccordionItem class="question-block" [ngClass]="'question-block--weight-' + block.weightPercent">
      <h2 ngbAccordionHeader>
        <button ngbAccordionButton class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <span>Bloque {{ block.id }} · preguntas {{ block.range }}</span>
          <div class="progress question-block__progress" role="progressbar"
               [attr.aria-valuenow]="block.answeredCount" aria-valuemin="0" aria-valuemax="6"
               [attr.aria-label]="block.answeredCount + ' de 6 preguntas respondidas'">
            <div class="progress-bar" [style.width.%]="(block.answeredCount / 6) * 100"></div>
          </div>
        </button>
      </h2>
      <div ngbAccordionCollapse>
        <div ngbAccordionBody>
          <ng-template>
            <!-- las 6 preguntas del bloque como pestañas (una pregunta visible a la vez), no apiladas -->
            <ul ngbNav #nav="ngbNav" [(activeId)]="block.activeQuestionIndex" class="nav nav-pills question-tab-strip mb-3">
              @for (q of block.questions; track q.id; let i = $index) {
                <li [ngbNavItem]="i">
                  <button ngbNavLink class="d-flex align-items-center gap-1">
                    @if (q.answered) {
                      <i class="bi bi-check-circle-fill text-success"></i>
                    } @else {
                      <i class="bi bi-circle text-body-secondary"></i>
                    }
                    {{ i + 1 }}
                  </button>
                  <ng-template ngbNavContent>
                    <div class="question-pane">
                      <label class="form-label">{{ q.text }}</label>
                      <!-- w-100 + rows="4": ocupa todo el ancho del panel y muestra al menos 4 líneas -->
                      <textarea
                        class="form-control w-100"
                        rows="4"
                        [(ngModel)]="q.answer"
                        (blur)="saveDraft()"></textarea>
                    </div>
                  </ng-template>
                </li>
              }
            </ul>
            <div [ngbNavOutlet]="nav"></div>
          </ng-template>
        </div>
      </div>
    </div>
  }
</div>

<div class="d-flex justify-content-end mt-4">
  <button type="button" class="btn btn-primary" [disabled]="!allAnswered()" (click)="onSubmit()">
    Enviar cuestionario
  </button>
</div>
```

## Casos especiales (excepciones ya justificadas — no añadas más sin documentarlas aquí)

- **`results-dashboard`**: usa un grid de cards en vez de una única card, porque muestra hasta 3
  comparaciones en paralelo (ver `SKILL.md`).
- **`features/questionnaire`**: no usa el patrón container+card estándar — usa el acordeón de 6 paneles
  de arriba en su lugar, porque la agrupación por bloque y su gradiente de peso son parte del propio
  contenido, no algo que quepa dentro de una card genérica.
