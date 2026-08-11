---
name: ui-design-consistency
description: Guía obligatoria de estructura y consistencia visual para cualquier pantalla o componente de apps/frontend (Angular) del proyecto compatibility-check-app. Consúltala SIEMPRE antes de crear un componente nuevo en features/*, core/shell o shared/*, y también al revisar, editar o dar feedback sobre pantallas existentes (auth, registration, questionnaire, processing, results-dashboard, settings, chats) — incluso si el usuario no menciona explícitamente "diseño", "consistencia", "Bootstrap" o "UI". Aplica también cuando se pida "una pantalla nueva", "un formulario", "una tarjeta de resultado", "el dashboard" o cualquier trabajo de maquetación. Define el shell de página, el patrón container+card, el sistema de botones/iconos/formularios/estados de carga-vacío-error, y las reglas responsive mobile-first ya decididas para este proyecto.
---

# Consistencia de diseño en la UI de AfinIA

La app se llama **AfinIA** de cara a la persona usuaria; `compatibility-check-app` es solo el nombre
técnico del repo/paquete y no debe aparecer en ninguna pantalla.

## Por qué existe esta skill

Este proyecto tiene 10 pantallas (login, registro paso 1, forgot/reset password, registro paso 2,
cuestionario, procesando, dashboard, configuración, listado de chats, conversación de chat) construidas
por una sola persona a lo largo de varias sesiones de trabajo. El riesgo real no es que una pantalla
individual quede fea, sino que cada
una se resuelva con un criterio distinto — un formulario con Bootstrap y el siguiente con CSS a medida,
una tarjeta con sombra y la siguiente sin ella, un botón de "guardar" que a veces es azul y a veces
verde — y que el conjunto no se sienta como una sola aplicación. Esta skill existe para que, pantalla a
pantalla, se reutilicen las mismas decisiones ya tomadas en `openspec/changes/build-compatibility-mvp/design.md`
(decisiones 3c-bis, 3c-ter, 3d y 9) en vez de que cada componente nuevo las reinvente.

Si estás creando o tocando cualquier fichero bajo `apps/frontend/src/app/`, sigue esta guía. Si algo que
ves en el código o en lo que se te pide contradice estas convenciones, dilo explícitamente antes de
implementarlo — no lo implementes en silencio y no lo dejes pasar en silencio tampoco.

## Marca: nombre "AfinIA" y el logo

- El nombre visible en cualquier pantalla es **AfinIA** — si ves "Compatibility Check" en código o en un
  mockup antiguo, es un remanente por corregir, no una alternativa válida.
- El logo es una marca abstracta de un solo color (5 `<path>`, sin relleno fijo). El marcado exacto
  vive en `references/design-tokens.md` — no lo redibujes ni cambies el `viewBox` (`0 0 345.3 336.08`).
- **Siempre inline `<svg>`, nunca `<img src="logo.svg">`**: así el logo hereda color por CSS
  (`fill: currentColor`) en vez de necesitar un fichero por color. El mismo SVG sirve en negro sobre el
  navbar de Shell A y en naranja sobre la card de Shell B.
- **Shell A (navbar)**: ~28px, hereda el color de texto del navbar (`$dark`) — sin color propio.
- **Shell B (card de autenticación)**: ~48px, centrado encima del nombre, en `$primary` — es la única
  superficie donde el logo lleva el color de marca en vez de heredar el texto, porque login/registro es
  la primera impresión de la app.

## Los dos "shells" de la aplicación

Toda pantalla pertenece a uno de dos shells. No hay una tercera opción ni pantallas "sueltas".

### Shell A — Pantallas autenticadas (`core/shell`)

Usado por: **completar perfil (registro paso 2)**, cuestionario, procesando, dashboard, configuración.

**Caso especial — completar perfil**: el usuario ya tiene sesión (JWT válido) pero todavía no tiene fila
en `users`, así que no hay nada que "configurar" ni nadie con quien chatear todavía (no puede haber
compatibilidad calculada sin perfil). En esta pantalla concreta, la cabecera de Shell A se muestra **sin
el icono de chat ni el enlace de Configuración** — solo el botón de cerrar sesión. El resto de pantallas
de Shell A sí llevan los tres.

```html
<nav class="navbar navbar-expand-md navbar-light bg-white border-bottom sticky-top">
  <div class="container">
    <span class="navbar-brand d-flex align-items-center gap-2">
      <svg class="brand-mark" viewBox="0 0 345.3 336.08" width="28" height="28" aria-hidden="true">
        <!-- 5 <path> del logo — copia el bloque completo de references/design-tokens.md -->
      </svg>
      AfinIA
    </span>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navShell">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navShell">
      <ul class="navbar-nav ms-auto align-items-md-center gap-2">
        <li class="nav-item">
          <button class="btn btn-link nav-link position-relative" routerLink="/chats">
            <i class="bi bi-chat-dots"></i> Chats
            <span class="position-absolute top-0 start-100 translate-middle p-1 bg-secondary
                         border border-light rounded-circle" *ngIf="hasUnreadMessages()">
              <span class="visually-hidden">Mensajes sin leer</span>
            </span>
          </button>
        </li>
        <li class="nav-item">
          <button class="btn btn-link nav-link" routerLink="/settings">
            <i class="bi bi-gear"></i> Configuración
          </button>
        </li>
        <li class="nav-item">
          <button class="btn btn-outline-dark btn-sm" (click)="logout()">
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
- Los botones de chat, configuración y logout van siempre en ese orden (chat primero, a la izquierda de
  Configuración), siempre a la derecha (`ms-auto`), nunca en el lado izquierdo ni intercambiados de
  orden entre pantallas.
- El icono de chat lleva un punto de notificación (`bg-secondary` — el rojo Carmine, uso legítimo como
  acento de "atención", no como botón neutro) cuando hay mensajes sin leer, con el patrón estándar de
  Bootstrap de badge posicionado (`position-relative` en el botón + `position-absolute
  top-0 start-100 translate-middle` en el punto) — no inventes un badge con estilos propios.
- `<main class="container py-4 py-md-5">` es el único punto donde cada feature inyecta su contenido.
  Ninguna pantalla autenticada debería envolver su contenido en su propio `container` adicional — ya lo
  provee el shell.

### Shell B — Pantallas públicas de autenticación (`features/auth`)

Usado por: login, registro paso 1, forgot password, reset password.

```html
<div class="min-vh-100 d-flex align-items-center justify-content-center bg-light py-4">
  <div class="card shadow-sm" style="max-width: 420px; width: 100%;">
    <div class="card-body p-4">
      <div class="text-center mb-4">
        <svg class="brand-mark brand-mark--accent" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true">
          <!-- 5 <path> del logo — copia el bloque completo de references/design-tokens.md -->
        </svg>
        <h1 class="h4 mt-2 mb-0">AfinIA</h1>
      </div>
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

- **Paleta de color** (5 colores base, sin excepciones ni tonos "de más" inventados por pantalla):
  - `#FB8500` (naranja "Princeton") → color **primario** de marca: botones principales, elementos
    activos, acentos.
  - `#BE1E2D` (rojo "Carmine") → estados hover/active del primario, acento secundario (icono de racha,
    extremo más intenso del gradiente de bloques del cuestionario). **No lo uses para
    `btn-outline-secondary`** — ver la nota en "Sistema de botones" más abajo: al ser rojo, un botón
    outline con este color se lee como una acción destructiva, no como una acción neutra.
  - `#000000` (negro) → texto principal y superficies oscuras. A diferencia de la paleta anterior, aquí
    el negro puro es un color de marca deliberado (extremo del gradiente del bloque de mayor peso), no
    una concesión que evitar.
  - `#FDF0D5` (crema "Papaya Whip") → fondos suaves de sección, superficie alternativa a `bg-light`, y
    extremo "frío" del gradiente de bloques del cuestionario (ver más abajo).
  - `#FFFFFF` (blanco) → fondo base de cards y superficies claras, y el otro extremo frío del mismo
    gradiente.
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
  Son plantillas de ejemplo pensadas explícitamente por Bootstrap para copiarse y adaptarse — úsalas
  como esqueleto, no las dejes con sus colores/tipografía por defecto. El cuestionario **no** se basa en
  ninguna de estas plantillas de Bootstrap — sigue su propio patrón de wizard, ver siguiente sección.

## Cuestionario: wizard de 6 pasos (un bloque por pantalla) con barra de progreso ponderada

El cuestionario de 36 preguntas se agrupa en **6 bloques de 6 preguntas**, el mismo agrupamiento usado
para el cálculo ponderado (`block: 1..6` en `supabase/seed/seed-users.json`, pesos 5/5/15/20/25/30% —
ver `design.md` decisión 6c). **Los 6 bloques nunca se muestran a la vez en la misma pantalla**: es un
wizard de 6 pasos — se ve un bloque completo por pantalla, con navegación hacia atrás/adelante entre
bloques, inspirado en el patrón de "un campo/bloque por pantalla + barra de progreso arriba + flecha de
volver" típico de los onboardings de apps móviles. Esto sustituye el planteamiento anterior de acordeón
con los 6 paneles visibles a la vez.

Reglas concretas:
- **Cabecera de wizard**, fija encima de la card del paso actual (no dentro de ella): a la izquierda una
  flecha de volver (`btn btn-link p-0` + `bi-arrow-left`) que navega al bloque anterior — en el bloque 1
  sale del cuestionario en vez de retroceder a un bloque inexistente. A la derecha de la flecha, la
  **barra de progreso ponderada** (ver siguiente punto) y, junto a ella, la racha (ver gamificación).
- **Barra de progreso ponderada**: no es una barra simple de "respondidas/36" — son **6 segmentos en
  línea, uno por bloque, con el ancho proporcional a su peso** (5/5/15/20/25/30, así que los bloques 1 y
  2 ocupan el mismo ancho, el más estrecho, y el bloque 6 el más ancho). Cada segmento se rellena de
  izquierda a derecha con el gradiente de ese bloque (según su peso, no su número — bloques 1 y 2 usan
  **exactamente el mismo gradiente**) según la proporción de sus 6 preguntas ya respondidas. Este único
  elemento sustituye tanto a la barra de progreso global como al color por panel de la versión anterior:
  el semáforo por peso ahora vive en la barra, no en 6 tarjetas apiladas. La tabla exacta de gradientes
  por peso está en `references/design-tokens.md` — no la inventes ni la aproximes a ojo.
- Un bloque por el que ya pasaste queda marcado en su segmento (relleno según lo respondido, con un
  icono de check superpuesto si llegó a 6/6). **Ese segmento es clicable**: al pulsarlo, el wizard salta
  directamente a ese bloque para revisarlo o editarlo — no hace falta volver atrás bloque a bloque con la
  flecha para corregir algo de dos bloques antes. Solo son clicables los segmentos de bloques ya
  visitados (índice ≤ el bloque más avanzado alcanzado); los bloques a los que aún no has llegado no se
  pueden saltar por delante — el orden de progreso sigue siendo 1→6, lo único libre es volver atrás.
- La barra **nunca muestra el peso como texto** (nada de "Bloque 3 · 15%"): el peso se comunica solo por
  el ancho y el color de cada segmento — evita que la pantalla se sienta "matemática".
- **Dentro del bloque activo, las 6 preguntas no van apiladas verticalmente**: se muestran como
  **pestañas** (`NgbNav`), una pestaña por pregunta, mostrando una sola pregunta/respuesta a la vez.
  Cada pestaña indica si esa pregunta ya está respondida (icono relleno) o no (icono vacío), y cambiar
  de pestaña anima el contenido con una transición sutil (fade + desplazamiento horizontal corto, ~200ms,
  `ease-out`) en vez de un cambio brusco — los valores exactos de la transición están en
  `references/design-tokens.md`, igual que el resto de tokens. Respeta `prefers-reduced-motion`: sin la
  transición animada para quien la tenga desactivada, el cambio de pestaña sigue funcionando igual.
- El `<textarea>` de cada pregunta ocupa **todo el ancho de la card** (`w-100`/`form-control`, nunca un
  ancho fijo en píxeles ni una columna estrecha) y tiene altura suficiente para previsualizar **al menos
  4 líneas de texto** (`rows="4"` como mínimo) — no un campo de una sola línea. Respuestas más largas
  siguen siendo editables con scroll/resize dentro del propio `textarea`, pero el tamaño de partida debe
  invitar a escribir una respuesta con cierto desarrollo, no dar la sensación de un campo corto.
- **Navegar entre bloques es libre, no exige haber terminado el actual**: la persona puede avanzar a
  "Siguiente bloque" con preguntas sin responder y volver más tarde — el envío final
  (`POST /users/me/questionnaire`, ver spec `personal-questionnaire`) sigue siendo el único punto que
  exige las 36 respuestas completas; el wizard es solo la forma de navegar la entrada de datos, no cambia
  esa regla de validación. El borrador se sigue guardando en BD, no en `localStorage` (decisión 5c).
- **Revisar un bloque anterior no te "atasca" ahí**: el estado distingue el bloque que se está viendo
  (`currentBlockIndex`) del bloque más avanzado al que ya llegaste (`maxReachedBlockIndex`). Si entraste a
  revisar un bloque anterior (por la flecha o haciendo clic en su segmento), el botón del `card-footer`
  cambia de "Siguiente bloque" a **"Volver a donde estabas"** y te devuelve directamente a
  `maxReachedBlockIndex` en vez de obligarte a pasar de nuevo por cada bloque intermedio uno a uno.
- El paso del bloque activo sigue el patrón container+card normal (ver más abajo): la card lleva un
  `card-header` con el gradiente de ese bloque (título del bloque, sin el peso como texto, más la
  insignia si ya está completo) y un `card-body` con las pestañas + `textarea`, en fondo claro/blanco
  para que el texto siga siendo legible. El `card-footer` lleva un único botón, cuyo texto depende de si
  estás avanzando o revisando (ver punto anterior) — la flecha de volver de la cabecera ya cubre "un paso
  atrás", así que el footer nunca necesita un botón secundario.
- Ya no uses `NgbAccordion` para los 6 bloques — implicaría tenerlos todos montados (aunque colapsados) a
  la vez, justo lo que este patrón evita. Usa un estado simple (`currentBlockIndex` +
  `maxReachedBlockIndex`) y renderiza solo la card del bloque activo. `NgbNav` para las 6 pestañas dentro
  del bloque sigue igual que antes.

### Gamificación del cuestionario: refuerzo visual, no una mecánica nueva

El cuestionario es largo (36 preguntas) y el riesgo de abandono es real, así que se añade **refuerzo
visual de progreso** sobre los mismos datos que ya existen (respondida/no respondida, bloque
completo/no) — esto no introduce puntos, ranking entre usuarios, límite de tiempo, ni cambia la regla
de validación (las 36 respuestas siguen siendo obligatorias para el envío final). Si en algún momento se
plantea añadir alguno de esos tres elementos, es una decisión de producto que hay que hablar antes, no
algo que esta skill autoriza.

- **Copy motivacional** bajo la barra de progreso ponderada: por tramo de respondidas/36, no el
  porcentaje numérico frío ("38%") — las 4 frases exactas están en `references/design-tokens.md` (una
  por tramo: 0-11, 12-23, 24-35, 36/36).
- **Racha de respuestas (streak)**, junto a la barra: `<i class="bi bi-fire text-secondary"></i>` + el
  **máximo de preguntas respondidas a la vez alcanzado en la sesión activa** — no el conteo en tiempo
  real (ese ya lo da la barra). Por eso, si el usuario borra o vacía una respuesta ya contada para
  editarla, la racha no baja; es un refuerzo positivo que nunca retrocede. Es puramente de UI — no
  persiste entre sesiones, no se envía al backend, y no debe confundirse con el borrador persistido en
  BD (decisión 5c de `design.md`). Se reinicia a 0 si se recarga la pantalla; eso es intencional.
- **Insignia de bloque completado**: cuando las 6 preguntas del bloque activo están respondidas, aparece
  `bi-award-fill` (color `$primary` — el naranja se lee como logro/celebración; el rojo de `$secondary`
  se reserva para el hover y el extremo más intenso del gradiente, no para esto) en el `card-header` de
  ese bloque, con la animación `block-badge-in` (scale 0.6→1 + fade) de `references/design-tokens.md`.
  El mismo icono, ya sin animación, es el que queda superpuesto en el segmento de la barra al avanzar de
  bloque (ver arriba). No dupliques el estado con un badge de texto tipo "Completado".
- **Micro-animación al responder**: cuando el `textarea` de una pregunta pasa de vacío a con contenido,
  el icono de su pestaña pasa de `bi-circle` a `bi-check-circle-fill` con la animación `tab-icon-pop`
  (scale 1→1.3→1) de `references/design-tokens.md`.
- **Banner de cierre** al llegar a 36/36 (aparece en el paso del bloque 6, encima de la card, nunca
  sustituyéndola): usa el gradiente de ese mismo bloque (`linear-gradient(135deg, #BE1E2D, #000000)`,
  reutilizado — no es un color nuevo), texto blanco, icono `bi-stars` y el mensaje fijo "¡Cuestionario
  completo! Ya puedes enviarlo." Es informativo: el botón real de envío sigue siendo el del
  `card-footer`, el banner no lo sustituye ni lo deshabilita.
- Todas las animaciones de esta sección respetan `prefers-reduced-motion` con el mismo criterio que la
  transición de pestañas: sin el efecto animado, el cambio de estado (insignia, icono, banner) sigue
  ocurriendo igual, solo sin la animación.

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
sigue internamente esta misma estructura `card-body` (+ `card-footer` si tiene acciones). La
**conversación de chat** (`features/chats/:id`) es otra excepción, descrita en la siguiente sección: el
`card-body` no es un formulario sino la lista de mensajes con scroll propio.

**Privacidad en el dashboard (regla de contenido, no solo de maquetación)**: ninguna pantalla SHALL
mostrar el texto de las respuestas de otro usuario, ni siquiera dentro del detalle expandible por
pregunta. Cada card muestra el score general y las 6 puntuaciones por dimensión; el detalle expandible
(opcional, no visible por defecto) se limita al texto de la pregunta, las puntuaciones de esa pregunta y
la justificación/explicación de la IA — nunca `respuesta_usuario_1`/`respuesta_usuario_2`. Esto no es
una decisión de estilo: ver `design.md` decisión 5d y `specs/results-dashboard` para el porqué.

## Chat interno: botón en la card de compatibilidad, listado y conversación

Tres piezas de UI para la capability `internal-chat` (ver `design.md` decisión 9):

- **Botón "Chatear" en cada card del dashboard**: junto al resto de acciones de la card (ver
  `results-dashboard`), `btn btn-primary btn-sm` con icono `bi-chat-dots` que llama a
  `POST /conversations` con el candidato de esa card y navega a `features/chats/:id` con la conversación
  devuelta (nueva o ya existente — el backend es idempotente, la UI nunca decide si crear o reutilizar).
- **`features/chats` (listado)**: sigue el patrón container+card normal, pero el `card-body` contiene un
  `list-group` (no un formulario) con una fila por conversación — foto/alias del otro participante,
  último mensaje (truncado) y su fecha, más un punto de no leído si aplica. Ordenado por actividad más
  reciente. Sin card-footer (no hay una acción "principal" del listado en sí).
- **`features/chats/:id` (conversación)**: **excepción al patrón container+card estándar**, igual que el
  dashboard o el cuestionario. `card-header` con foto/alias del otro participante y una flecha de volver
  al listado; `card-body` con scroll propio (`overflow-y: auto`, altura fija en CSS, nunca
  `height: 100vh` a pelo) mostrando los mensajes en orden cronológico; `card-footer` con un
  `<input>`/`form-control` de texto + botón de enviar (icono `bi-send`, `btn-primary`) — es el único
  "formulario" real de esta pantalla.

Mensajes propios alineados a la derecha en `$primary` con texto blanco; mensajes del otro participante a
la izquierda en un fondo neutro claro con texto oscuro — es el único sitio de la app con "burbujas" de
chat, así que necesita CSS propio (no hay una clase de Bootstrap equivalente); el marcado y CSS exactos
están en `references/design-tokens.md`. Los mensajes largos hacen `word-break` dentro de la burbuja, sin
generar scroll horizontal en ningún viewport (ver sección de responsive).

## Sistema de botones, iconos y formularios

No inventes un patrón nuevo por pantalla para estas cosas — reutiliza siempre el mismo:

- **Botón principal de una pantalla/card** (enviar, guardar, continuar, recalcular): `btn btn-primary`.
  Solo debe haber uno por card como acción "principal".
- **Acción secundaria** (cancelar, volver, "¿olvidaste tu contraseña?"): `btn btn-outline-dark`
  o `btn btn-link` si es más un enlace que una acción. **No uses `btn-outline-secondary`**: desde el
  cambio de paleta `$secondary` es el rojo Carmine, y un botón outline en rojo se lee como una acción
  destructiva, no como una acción secundaria neutra.
- **Acción destructiva o de cierre de sesión**: `btn btn-outline-dark` con icono — por el mismo motivo
  de arriba, nunca `btn-outline-secondary` (rojo) ni `btn-danger` para logout: no es una acción
  destructiva, es una acción neutra, y el rojo de la paleta queda reservado para hover/acentos.
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
  `design.md`): siguen siendo `card` en grid, **no chips ni píldoras** — lo único que cambia respecto a
  la versión anterior es el **diseño del check** de "seleccionada". En vez de un `bi-check-circle-fill`
  inline junto a la etiqueta, la card seleccionada lleva `border-primary bg-primary-subtle` (igual que
  antes) más una **insignia circular superpuesta en la esquina** (`bi-check-lg` sobre fondo `$primary`,
  ligeramente fuera del borde de la card) que aparece con una animación de entrada (`quality-check-in`,
  scale 0.4→1 + fade) — el mismo lenguaje visual que la insignia de bloque completado del cuestionario,
  para que "marcar algo como elegido" se sienta igual en toda la app. **Tope de 5 en la propia
  interacción, no solo al enviar**: en cuanto hay 5 seleccionadas, las cards no marcadas se deshabilitan
  (`disabled`, sin `(click)`) hasta que se desmarca alguna — desmarcar siempre está permitido. Sigue
  siendo un `<button>` con `[attr.aria-pressed]`, nunca un `<div>` con solo un `(click)`. El marcado
  exacto está en `references/design-tokens.md`. El mismo componente debe reutilizarse en registro paso 2
  **y** en configuración — no dupliques el marcado en los dos sitios, extrae un componente compartido
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
- [ ] Si la pantalla es el cuestionario: ¿se ve un único bloque a la vez (nunca los 6 montados en la
      misma pantalla), con la barra de progreso ponderada usando el gradiente por peso de
      `design-tokens.md` y los bloques de igual peso (1 y 2) visualmente idénticos?
- [ ] Si la pantalla es el cuestionario: ¿se puede volver a revisar y editar cualquier bloque anterior ya
      visitado (flecha de volver o clic en su segmento de la barra), y el botón del `card-footer` cambia
      a "Volver a donde estabas" cuando estás revisando en vez de avanzando?
- [ ] Si la pantalla es el cuestionario: ¿los refuerzos de gamificación (racha, insignia de bloque,
      banner final) usan solo colores de la paleta ya definida y no cambian la regla de que hacen falta
      las 36 respuestas para enviar?
- [ ] ¿Ningún botón "neutro" (secundario o logout) usa `btn-outline-secondary`? Desde el cambio de
      paleta ese color es rojo y se lee como destructivo — usa `btn-outline-dark`.
- [ ] Si la pantalla tiene cards de cualidades: ¿las no seleccionadas se deshabilitan al llegar a 5
      marcadas (no se puede marcar una sexta), permitiendo siempre desmarcar?
- [ ] Si la pantalla es Shell A: ¿el icono de chat aparece a la izquierda de Configuración (chat,
      configuración, logout, en ese orden), y ambos (chat + configuración) están ausentes en la pantalla
      de completar perfil?
- [ ] Si la pantalla es una conversación de chat: ¿los mensajes propios y los del otro participante se
      distinguen por alineación/color (no solo por texto), y el área de mensajes tiene scroll propio en
      vez de hacer crecer toda la página?

Si la respuesta a alguna de estas preguntas es "no" y no hay una razón concreta para la excepción,
corrígelo antes de considerar la pantalla terminada — y si la razón para la excepción existe, dila en
voz alta (coméntala al usuario o en el PR) en vez de dejar la desviación sin explicar.

## Ver también

- `openspec/changes/build-compatibility-mvp/design.md` — decisiones 3c-bis (Bootstrap como sistema de
  diseño), 3c-ter (responsive), 3c-quater (paleta, tipografía y wizard del cuestionario), 3d (cards de
  cualidades) y 9 (chat interno) son la fuente de verdad de la que sale esta skill; si esas decisiones
  cambian, esta skill debe actualizarse a la vez.
- `openspec/changes/build-compatibility-mvp/specs/internal-chat/spec.md` — requisitos formales del chat
  (elegibilidad, acceso desde el menú, no leídos) que la UI descrita aquí debe cumplir.
- `references/page-template.md` — plantilla de partida copy-paste para arrancar un componente de
  pantalla nuevo ya con la estructura correcta.
- `references/design-tokens.md` — valores exactos de color/tipografía, el snippet de Sass para
  recompilar Bootstrap con ellos, y la tabla de gradientes por peso de los 6 paneles del cuestionario.
