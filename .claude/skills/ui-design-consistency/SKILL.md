---
name: ui-design-consistency
description: Guía obligatoria de estructura y consistencia visual para cualquier pantalla o componente de apps/frontend (Angular) del proyecto compatibility-check-app. Consúltala SIEMPRE antes de crear un componente nuevo en features/*, core/shell o shared/*, y también al revisar, editar o dar feedback sobre pantallas existentes (auth, registration, questionnaire, processing, results-dashboard, settings) — incluso si el usuario no menciona explícitamente "diseño", "consistencia", "Bootstrap" o "UI". Aplica también cuando se pida "una pantalla nueva", "un formulario", "una tarjeta de resultado", "el dashboard" o cualquier trabajo de maquetación. Define el shell de página, el patrón container+card, el sistema de botones/iconos/formularios/estados de carga-vacío-error, y las reglas responsive mobile-first ya decididas para este proyecto.
---

# Consistencia de diseño en la UI de compatibility-check-app

## Por qué existe esta skill

Este proyecto tiene 8 pantallas (login, registro paso 1, forgot/reset password, registro paso 2,
cuestionario, procesando, dashboard, configuración) construidas por una sola persona a lo largo de
varias sesiones de trabajo. El riesgo real no es que una pantalla individual quede fea, sino que cada
una se resuelva con un criterio distinto — un formulario con Bootstrap y el siguiente con CSS a medida,
una tarjeta con sombra y la siguiente sin ella, un botón de "guardar" que a veces es azul y a veces
verde — y que el conjunto no se sienta como una sola aplicación. Esta skill existe para que, pantalla a
pantalla, se reutilicen las mismas decisiones ya tomadas en `openspec/changes/build-compatibility-mvp/design.md`
(decisiones 3c-bis, 3c-ter y 3d) en vez de que cada componente nuevo las reinvente.

Si estás creando o tocando cualquier fichero bajo `apps/frontend/src/app/`, sigue esta guía. Si algo que
ves en el código o en lo que se te pide contradice estas convenciones, dilo explícitamente antes de
implementarlo — no lo implementes en silencio y no lo dejes pasar en silencio tampoco.

## Los dos "shells" de la aplicación

Toda pantalla pertenece a uno de dos shells. No hay una tercera opción ni pantallas "sueltas".

### Shell A — Pantallas autenticadas (`core/shell`)

Usado por: **completar perfil (registro paso 2)**, cuestionario, procesando, dashboard, configuración.

**Caso especial — completar perfil**: el usuario ya tiene sesión (JWT válido) pero todavía no tiene fila
en `users`, así que no hay nada que "configurar" todavía. En esta pantalla concreta, la cabecera de Shell
A se muestra **sin el enlace de Configuración** — solo el botón de cerrar sesión — porque el enlace
llevaría a una pantalla de ajustes sobre un perfil que aún no existe. El resto de pantallas de Shell A sí
llevan ambos botones.

```html
<nav class="navbar navbar-expand-md navbar-light bg-white border-bottom sticky-top">
  <div class="container">
    <span class="navbar-brand">Compatibility Check</span>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navShell">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navShell">
      <ul class="navbar-nav ms-auto align-items-md-center gap-2">
        <li class="nav-item">
          <button class="btn btn-link nav-link" routerLink="/settings">
            <i class="bi bi-gear"></i> Configuración
          </button>
        </li>
        <li class="nav-item">
          <button class="btn btn-outline-secondary btn-sm" (click)="logout()">
            <i class="bi bi-box-arrow-right"></i> Cerrar sesión
          </button>
        </li>
      </ul>
    </div>
  </div>
</nav>

<main class="container py-4 py-md-5">
  <router-outlet></router-outlet>
</main>
```

Por qué es así:
- `navbar-expand-md` es lo que hace que la cabecera colapse a menú hamburguesa por debajo de 768px —
  es la implementación literal de la decisión 3c-ter ("la cabecera colapsa a menú hamburguesa en
  móvil"). No lo sustituyas por un `<header>` a medida con media queries propias.
- Los botones de configuración y logout van siempre en ese orden, siempre a la derecha
  (`ms-auto`), nunca en el lado izquierdo ni intercambiados de orden entre pantallas.
- `<main class="container py-4 py-md-5">` es el único punto donde cada feature inyecta su contenido.
  Ninguna pantalla autenticada debería envolver su contenido en su propio `container` adicional — ya lo
  provee el shell.

### Shell B — Pantallas públicas de autenticación (`features/auth`)

Usado por: login, registro paso 1, forgot password, reset password.

```html
<div class="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
  <div class="card shadow-sm" style="max-width: 420px; width: 100%;">
    <div class="card-body p-4">
      <h1 class="h4 text-center mb-4">Compatibility Check</h1>
      <!-- contenido específico: formulario de login / registro / forgot / reset -->
    </div>
  </div>
</div>
```

Por qué es así: las 4 pantallas de `features/auth` son estados de un mismo flujo (nadie ve dos a la vez,
y visualmente deberían sentirse como la misma tarjeta cambiando de contenido, no como 4 diseños
distintos). No lleva navbar porque todavía no hay sesión que cerrar ni configuración que abrir.

## Sistema de color y tipografía (branding)

Bootstrap da la estructura, pero el aspecto visual de la app no es el azul/gris por defecto de
Bootstrap — tiene una paleta e identidad tipográfica propias, que deben aplicarse igual en las 8
pantallas:

- **Paleta de color** (4 colores base, sin excepciones ni tonos "de más" inventados por pantalla):
  - `#E67E22` (naranja "carrot") → color **primario** de marca: botones principales, elementos activos,
    acentos.
  - `#D35400` (naranja "pumpkin", más oscuro) → estados hover/active del primario, y acento secundario
    (iconos destacados, badges, bordes de énfasis).
  - `#0D1B2A` (azul marino casi negro) → texto principal y superficies oscuras (por ejemplo, si se
    decide un navbar oscuro en vez de blanco); nunca negro puro (`#000`).
  - `#FCF3CF` (crema pálido) → fondos suaves de sección, superficie alternativa a `bg-light`, y color
    "frío"/de baja intensidad dentro del gradiente de bloques del cuestionario (ver más abajo).
- **Tipografía**: familia principal **Poppins** (geométrica, cercana, encaja con una paleta cálida y un
  producto orientado a personas, no a un panel corporativo). `DM Sans` o `Roboto` son alternativas
  válidas si Poppins da problemas de carga/licencia, pero no mezcles las tres en la misma build — se
  elige una y se usa en todo el proyecto.
- **Cómo aplicarlo sin pelear con Bootstrap**: no sobrescribas clases sueltas de Bootstrap con CSS
  a medida. Compila Bootstrap desde su fuente Sass (`bootstrap/scss/bootstrap`) sobreescribiendo las
  variables `$primary`, `$secondary`, `$body-color`, `$font-family-base`, etc. **antes** del `@import`,
  para que `.btn-primary`, `.text-primary`, `.border-primary`, `.bg-primary-subtle`, etc. se recalculen
  solos con el color correcto en vez de necesitar overrides manuales por cada clase. El snippet exacto
  y los valores concretos están en `references/design-tokens.md` — cópialo tal cual en
  `apps/frontend/src/styles.scss` en vez de reinventarlo.
- **Inspiración de partida**: para no arrancar de una plantilla en blanco, básate en los ejemplos
  oficiales de Bootstrap 5 (`getbootstrap.com/docs/5.3/examples/`) como punto de partida estructural y
  luego aplica los tokens de color/tipografía de arriba:
  - *Sign-in* → base del Shell B (login/registro/forgot/reset), ya recogida en este documento.
  - *Dashboard* → base del Shell A (navbar superior + contenido), aunque sin el sidebar lateral que trae
    el ejemplo (no lo necesitamos).
  - *Album* / *Cards* → base del grid de tarjetas del dashboard de resultados.
  - El componente *Accordion* de la documentación de Bootstrap → base de los 6 paneles del cuestionario
    (ver siguiente sección).
  Son plantillas de ejemplo pensadas explícitamente por Bootstrap para copiarse y adaptarse — úsalas
  como esqueleto, no las dejes con sus colores/tipografía por defecto.

## Cuestionario: 6 bloques colapsables con gradiente de peso (semáforo)

El cuestionario de 36 preguntas ya no se presenta como un stepper lineal pregunta a pregunta: se agrupa
en **6 paneles colapsables (accordion)**, uno por cada bloque de 6 preguntas usado también para el
cálculo ponderado (`block: 1..6` en `supabase/seed/seed-users.json`, pesos 5/5/15/20/25/30% — ver
`design.md` decisión 6c). Cada panel lleva un fondo en gradiente sutil que va de verde (bloques de menor
peso) a rojo/naranja intenso (bloques de mayor peso), a modo de semáforo, para que la persona que
responde perciba de forma implícita que las últimas preguntas cuentan más en el resultado final.

Reglas concretas:
- Usa `NgbAccordion`/`NgbAccordionItem` de `@ng-bootstrap/ng-bootstrap` (no el `data-bs-toggle="collapse"`
  nativo de Bootstrap JS) — coherente con la decisión 3c-bis de no depender del bundle JS de Bootstrap.
- Los paneles se pueden abrir de forma independiente (no es un acordeón exclusivo de "solo uno
  abierto") — la persona puede ir y volver entre preguntas de distintos bloques libremente.
- El color de cada panel se determina por su **peso**, no por su número de bloque: los bloques 1 y 2
  pesan igual (5%) y deben verse **idénticos**, no ligeramente distintos. La tabla exacta de gradientes
  por peso está en `references/design-tokens.md` — no la inventes ni la aproximes a ojo.
- El texto del encabezado de cada panel (pregunta del bloque, contador de respondidas) debe mantener
  contraste suficiente sobre su gradiente — usa `#0D1B2A` en los paneles de fondo claro (bloques de
  menor peso) y texto claro en el panel más oscuro (bloque 6), nunca un color de texto fijo para los 6.
- Cada panel muestra en su cabecera una **barra de progreso** (`progress`/`progress-bar` de Bootstrap,
  no un contador numérico tipo "4/6") con la proporción de sus 6 preguntas ya respondidas, para que el
  estado de avance sea visible sin tener que abrir el panel.
- Ni la cabecera previa al acordeón ni el subtítulo de cada panel muestran el porcentaje de peso como
  texto (nada de "Bloque 3 · 15%"): el peso se comunica únicamente a través del gradiente de color, no
  con números — evita que la pantalla se sienta "matemática" y mantiene el semáforo como única señal.
- El envío del cuestionario completo sigue exigiendo las 36 respuestas (ver spec de
  `personal-questionnaire`); los paneles son solo una forma de agrupar visualmente la entrada de datos,
  no cambian esa regla de validación.
- **Dentro de cada panel, las 6 preguntas del bloque no van apiladas verticalmente**: se muestran como
  **pestañas** (`NgbNav`), una pestaña por pregunta, mostrando una sola pregunta/respuesta a la vez.
  Cada pestaña indica si esa pregunta ya está respondida (icono relleno) o no (icono vacío), y cambiar
  de pestaña anima el contenido con una transición sutil (fade + desplazamiento horizontal corto, ~200ms,
  `ease-out`) en vez de un cambio brusco — los valores exactos de la transición están en
  `references/design-tokens.md`, igual que el resto de tokens. Respeta `prefers-reduced-motion`: sin la
  transición animada para quien la tenga desactivada, el cambio de pestaña sigue funcionando igual.
- El `<textarea>` de cada pregunta ocupa **todo el ancho del panel** (`w-100`/`form-control`, nunca un
  ancho fijo en píxeles ni una columna estrecha) y tiene altura suficiente para previsualizar **al menos
  4 líneas de texto** (`rows="4"` como mínimo) — no un campo de una sola línea. Respuestas más largas
  siguen siendo editables con scroll/resize dentro del propio `textarea`, pero el tamaño de partida debe
  invitar a escribir una respuesta con cierto desarrollo, no dar la sensación de un campo corto.

## El patrón container + card para el contenido de cada feature

Dentro del `<main>` del Shell A, cada feature sigue esta misma jerarquía — no la de tu elección:

```html
<h1 class="h3 mb-1">Título de la pantalla</h1>
<p class="text-body-secondary mb-4">Subtítulo/explicación breve, opcional.</p>

<div class="card">
  <div class="card-body">
    <!-- formulario, stepper, o contenido principal de la feature -->
  </div>
  <div class="card-footer bg-white d-flex justify-content-end gap-2">
    <!-- acciones: el botón principal siempre a la derecha, acciones secundarias a su izquierda -->
  </div>
</div>
```

Excepción explícita: el **dashboard de resultados** no usa una única card, usa una **grid de cards**
(una por comparación) — ver la sección de responsive más abajo — pero cada card individual del grid
sigue internamente esta misma estructura `card-body` (+ `card-footer` si tiene acciones).

**Privacidad en el dashboard (regla de contenido, no solo de maquetación)**: ninguna pantalla SHALL
mostrar el texto de las respuestas de otro usuario, ni siquiera dentro del detalle expandible por
pregunta. Cada card muestra el score general y las 6 puntuaciones por dimensión; el detalle expandible
(opcional, no visible por defecto) se limita al texto de la pregunta, las puntuaciones de esa pregunta y
la justificación/explicación de la IA — nunca `respuesta_usuario_1`/`respuesta_usuario_2`. Esto no es
una decisión de estilo: ver `design.md` decisión 5d y `specs/results-dashboard` para el porqué.

## Sistema de botones, iconos y formularios

No inventes un patrón nuevo por pantalla para estas cosas — reutiliza siempre el mismo:

- **Botón principal de una pantalla/card** (enviar, guardar, continuar, recalcular): `btn btn-primary`.
  Solo debe haber uno por card como acción "principal".
- **Acción secundaria** (cancelar, volver, "¿olvidaste tu contraseña?"): `btn btn-outline-secondary`
  o `btn btn-link` si es más un enlace que una acción.
- **Acción destructiva o de cierre de sesión**: `btn btn-outline-secondary` con icono, nunca `btn-danger`
  para logout (no es una acción destructiva, es una acción neutra).
- **Iconos**: siempre Bootstrap Icons (`<i class="bi bi-xxx"></i>`), nunca mezclar con Font Awesome,
  Material Icons u otra fuente. Si necesitas un icono conceptual que ya se usa en otra pantalla (p. ej.
  "editar" o "foto"), reutiliza el mismo nombre de icono en vez de elegir uno visualmente distinto para
  el mismo concepto.
- **Formularios reactivos**: usa las clases de validación nativas de Bootstrap
  (`form-control`/`is-invalid` en el control, `invalid-feedback` para el mensaje de error) en vez de
  mensajes de error con `<span>` sueltos y estilos propios. El patrón es siempre:
  ```html
  <div class="mb-3">
    <label class="form-label" for="email">Email</label>
    <input id="email" class="form-control" [class.is-invalid]="email.invalid && email.touched" formControlName="email">
    <div class="invalid-feedback">Introduce un email válido.</div>
  </div>
  ```
- **Cards seleccionables** (las 15 cualidades en registro/configuración, ver decisión 3d de
  `design.md`): usa `card` con un estado visual claro de "seleccionada" (p. ej. `border-primary
  bg-primary-subtle`) y un `<button>`/`role="button"` accesible, no un `<div>` con solo un `(click)` sin
  semántica. El mismo componente de card seleccionable debe reutilizarse en registro paso 2 **y** en
  configuración — no dupliques el marcado en los dos sitios, extrae un componente compartido
  (`shared/quality-card` o similar).

## Estados de carga, vacío y error

Cada pantalla que depende de una llamada al backend (todas menos las puramente de formulario) necesita
los tres estados, siempre con el mismo patrón visual:

- **Cargando**: `<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary" role="status"></div></div>`
- **Vacío** (p. ej. dashboard sin comparaciones porque no había candidatos): `alert alert-warning` con
  icono `bi-info-circle`, nunca una card vacía sin explicación.
- **Error** (fallo de red, comparación en `status = 'error'`, etc.): `alert alert-danger` con icono
  `bi-exclamation-triangle` y, cuando aplique, un botón de reintento (`btn btn-outline-danger btn-sm`).

Si vas a escribir estos tres bloques por segunda vez en una pantalla distinta, es señal de que deberían
vivir en un componente compartido (`shared/loading-state`, `shared/empty-state`, etc.) en vez de
copiarse y pegarse — cópialos una vez para tener el patrón, luego extráelos.

## Responsive: las reglas no son "por pantalla", son transversales

Estas reglas (decisión 3c-ter de `design.md`) aplican a **todas** las pantallas, no se evalúan
pantalla por pantalla de forma aislada:

- Ninguna pantalla debe generar scroll horizontal en ningún viewport. Si un elemento necesita ancho fijo
  (tablas, por ejemplo), envuélvelo en un contenedor con `overflow-x: auto` en vez de dejar que
  desborde el `<main>`.
- El grid de tarjetas del dashboard usa clases de columna responsive, nunca un ancho fijo en píxeles:
  `class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3"` — 1 columna en móvil, hasta 3 en escritorio.
- Los gráficos radar (`ng2-charts`) se configuran siempre con `responsive: true` y
  `maintainAspectRatio: false` dentro de un contenedor con altura fija en CSS (`style="height: 280px"`),
  nunca con `width`/`height` fijos en el propio `<canvas>`.
- Antes de dar por terminada cualquier pantalla, compruébala en los 3 anchos de referencia del proyecto:
  ~375px (móvil), ~768px (tablet), ~1280px (escritorio) — no solo en el ancho por defecto del navegador
  de desarrollo.

## Checklist antes de dar una pantalla por terminada

- [ ] ¿Usa el shell correcto (A o B) sin duplicar `container`/navbar propios?
- [ ] ¿El contenido principal está en una card (o grid de cards) con `card-body`/`card-footer`, no en
      `<div>`s sueltos con estilos propios?
- [ ] ¿Los botones siguen la jerarquía primaria/secundaria y el principal está a la derecha?
- [ ] ¿Todos los iconos son Bootstrap Icons y reutilizan los mismos nombres que otras pantallas para el
      mismo concepto?
- [ ] ¿Los errores de formulario usan `is-invalid`/`invalid-feedback`, no marcado propio?
- [ ] ¿Existen los 3 estados (cargando/vacío/error) si la pantalla depende de una llamada al backend?
- [ ] ¿Se ha comprobado en los 3 breakpoints sin scroll horizontal?
- [ ] ¿No se ha añadido CSS a medida sin una razón que no se pueda resolver con utilidades de Bootstrap?
- [ ] ¿Los colores usados son los de `references/design-tokens.md` (vía `$primary`/`$secondary`/clases
      de Bootstrap recompiladas), no valores hexadecimales sueltos escritos a mano en el componente?
- [ ] ¿La tipografía es la familia elegida del proyecto (Poppins u otra ya decidida), no la fuente por
      defecto del navegador ni una nueva sin justificar?
- [ ] Si la pantalla es el cuestionario: ¿los 6 paneles usan el gradiente por peso de
      `design-tokens.md`, con los bloques de igual peso (1 y 2) visualmente idénticos?

Si la respuesta a alguna de estas preguntas es "no" y no hay una razón concreta para la excepción,
corrígelo antes de considerar la pantalla terminada — y si la razón para la excepción existe, dila en
voz alta (coméntala al usuario o en el PR) en vez de dejar la desviación sin explicar.

## Ver también

- `openspec/changes/build-compatibility-mvp/design.md` — decisiones 3c-bis (Bootstrap como sistema de
  diseño), 3c-ter (responsive), 3c-quater (paleta, tipografía y paneles de peso) y 3d (cards de
  cualidades) son la fuente de verdad de la que sale esta skill; si esas decisiones cambian, esta skill
  debe actualizarse a la vez.
- `references/page-template.md` — plantilla de partida copy-paste para arrancar un componente de
  pantalla nuevo ya con la estructura correcta.
- `references/design-tokens.md` — valores exactos de color/tipografía, el snippet de Sass para
  recompilar Bootstrap con ellos, y la tabla de gradientes por peso de los 6 paneles del cuestionario.
