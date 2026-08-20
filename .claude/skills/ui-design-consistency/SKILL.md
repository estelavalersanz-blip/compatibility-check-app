---
name: ui-design-consistency
description: Guía obligatoria de estructura y consistencia visual para cualquier pantalla o componente de apps/frontend (Angular) del proyecto compatibility-check-app. Consúltala SIEMPRE antes de crear un componente nuevo en features/*, core/shell o shared/*, y también al revisar, editar o dar feedback sobre pantallas existentes (auth, registration, questionnaire, processing, results-dashboard, settings, chats) — incluso si el usuario no menciona explícitamente "diseño", "consistencia", "Bootstrap" o "UI". Aplica también cuando se pida "una pantalla nueva", "un formulario", "una tarjeta de resultado", "el dashboard" o cualquier trabajo de maquetación. Define el shell de página, el patrón container+card, el sistema de botones/iconos/formularios/estados de carga-vacío-error, y las reglas responsive mobile-first ya decididas para este proyecto.
---

# Consistencia de diseño en la UI de AfinIA

La app se llama **AfinIA** de cara a la persona usuaria; `compatibility-check-app` es solo el nombre
técnico del repo/paquete y no debe aparecer en ninguna pantalla.

## Por qué existe esta skill

Este proyecto tiene 12 pantallas (landing pública, login, registro paso 1, forgot/reset password,
completar perfil paso 2a y 2b, cuestionario, procesando, dashboard, configuración, listado de chats,
conversación de chat) construidas por una sola persona a lo largo de varias sesiones de trabajo. El
riesgo real no es que una pantalla individual quede fea, sino que cada
una se resuelva con un criterio distinto — un formulario con Bootstrap y el siguiente con CSS a medida,
una tarjeta con sombra y la siguiente sin ella, un botón de "guardar" que a veces es azul y a veces
verde — y que el conjunto no se sienta como una sola aplicación. Esta skill existe para que, pantalla a
pantalla, se reutilicen las mismas decisiones ya tomadas en `design.md` del cambio original, ya
archivado en `openspec/changes/archive/2026-08-18-build-compatibility-mvp/design.md`
(decisiones 3c-bis, 3c-ter, 3c-quater, 3d, 3d-bis, 3e, 3f, 3g y 9) en vez de que cada componente nuevo
las reinvente.

Si estás creando o tocando cualquier fichero bajo `apps/frontend/src/app/`, sigue esta guía. Si algo que
ves en el código o en lo que se te pide contradice estas convenciones, dilo explícitamente antes de
implementarlo — no lo implementes en silencio y no lo dejes pasar en silencio tampoco.

## Marca: nombre "AfinIA" y el logo

- El nombre visible en cualquier pantalla es **AfinIA** — si ves "Compatibility Check" en código o en un
  mockup antiguo, es un remanente por corregir, no una alternativa válida.
- El logo es una marca abstracta de un solo color (5 `<path>`, sin relleno fijo). El marcado exacto
  vive en `references/design-tokens.md` — no lo redibujes ni cambies el `viewBox` (`0 0 345.3 336.08`).
- **Siempre inline `<svg>`, nunca `<img src="logo.svg">`**: así el logo hereda color por CSS en vez de
  necesitar un fichero por color.
- **Shell A (navbar)**: ~28px, `fill: currentColor` — hereda el color de texto del navbar (`$dark`), sin
  color propio.
- **Shell B (pantallas de autenticación, fondo degradado)**: ~48px, en **blanco fijo** (`#FFFFFF`, no
  `currentColor`) — es la única superficie donde el logo lleva un color fijo en vez de heredar el texto,
  porque el fondo ahí es siempre el degradado de marca (nunca blanco), así que "heredar" no aplicaría.
  Usa la clase `brand-mark--white` de `references/design-tokens.md`, no la variante `--accent` (naranja
  sobre card blanca) que quedó obsoleta con el rediseño de Shell B.
- Los archivos SVG originales (variante gris de un color, variante blanca, y los dos favicons
  positivo/negativo con fondo cuadrado redondeado) están guardados en `docs/brand/` como fuente — cuando
  exista `apps/frontend`, cópialos a `apps/frontend/src/assets/brand/` y referencia el favicon desde
  `angular.json`/`index.html`. Ver `docs/brand/README.md` para el mapeo exacto de cada archivo.

## Landing pública (`/`) — antes de cualquier shell

Primera pantalla que ve quien no tiene sesión (ver decisión 3g de `design.md`). Si `/` se visita con
sesión activa, no se muestra — redirige de inmediato a la resolución ya usada por la ruta autenticada
(cuestionario o dashboard, mismo guard de la sección "Shell A"). Sin navbar, sin card de formulario:

- Reutiliza el degradado de marca y el logo blanco de Shell B (continuidad visual hacia el login), pero
  el contenido es editorial, no un formulario: un titular de una frase, una frase de apoyo explicando el
  producto (cualidades + cuestionario de compatibilidad analizado por IA), y **un único botón** de CTA
  (`btn-dark`, mismo color de acción principal que el resto de la app) que navega a `/auth/login`. No
  añadas un segundo botón (p. ej. a registro) que no se haya pedido explícitamente.
- **Animación de entrada, una sola vez al cargar**: el logo se ensambla — sus 5 `<path>` aparecen con
  fundido + escala (0.6→1) escalonados unos `80ms` entre sí, mismo lenguaje que `quality-check-in`/
  `block-badge-in` ya usado en el resto de la app — y el titular + subtítulo + botón entran con un
  fundido corto justo después. El fondo tiene un desplazamiento de gradiente lento y continuo (ambiental,
  no protagonista, `12s` o más por ciclo). Con `prefers-reduced-motion: reduce`, todo aparece completo de
  inmediato y el degradado de fondo queda estático — nunca se elimina el contenido, solo la animación.

El marcado y CSS exactos están en `references/design-tokens.md`.

## Los dos "shells" de la aplicación (+ la landing pública, única excepción documentada)

Toda pantalla de la aplicación en sí pertenece a uno de dos shells — no hay una tercera opción ni
pantallas "sueltas" **dentro de la app**. La única excepción, fuera de ambos shells a propósito, es la
**landing pública** en `/` (ver más abajo): no tiene sesión que gestionar (no es Shell A) ni contiene un
formulario de autenticación (no es Shell B) — es contenido de marketing con un único botón hacia login.
No añadas una segunda pantalla "suelta" sin documentarla igual de explícitamente aquí.

### Shell A — Pantallas autenticadas (`core/shell`)

Usado por: **completar perfil (registro paso 2)**, cuestionario, procesando, dashboard, configuración.

**Caso especial — completar perfil**: el usuario ya tiene sesión (JWT válido) pero todavía no tiene fila
en `users`, así que no hay nada que "configurar" ni nadie con quien chatear todavía (no puede haber
compatibilidad calculada sin perfil). En esta pantalla concreta, la cabecera de Shell A se muestra **sin
el icono de chat ni el enlace de Configuración** — solo el botón de cerrar sesión. El resto de pantallas
de Shell A sí llevan los tres.

**El logo/"AfinIA" es un enlace a la pantalla principal**, no un elemento decorativo: navega a `/` y
reutiliza `mainRouteGuard` para resolver cuestionario o dashboard según el estado del usuario — único
punto de entrada de vuelta a la pantalla principal desde Configuración o Chats (ver
`references/design-tokens.md`, sección "Shell A", para el motivo completo).

```html
<nav class="navbar navbar-expand-md navbar-dark shell-navbar sticky-top">
  <div class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" routerLink="/" aria-label="Ir a la pantalla principal">
      <svg class="brand-mark" viewBox="0 0 345.3 336.08" width="28" height="28" aria-hidden="true">
        <!-- 5 <path> del logo — copia el bloque completo de references/design-tokens.md -->
      </svg>
      AfinIA
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navShell">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navShell">
      <ul class="navbar-nav ms-auto align-items-md-center gap-2">
        <li class="nav-item">
          <button class="btn btn-link nav-link position-relative" routerLink="/chats">
            <i class="bi bi-chat-dots"></i> Chats
            <span class="badge rounded-pill bg-white text-dark position-absolute top-0 start-100
                         translate-middle" *ngIf="unreadMessageCount() > 0"
                  [attr.aria-label]="unreadMessageCount() + ' mensajes sin leer'">
              {{ unreadMessageCount() }}
            </span>
          </button>
        </li>
        <li class="nav-item">
          <button class="btn btn-link nav-link" routerLink="/settings">
            <i class="bi bi-gear"></i> Configuración
          </button>
        </li>
        <li class="nav-item">
          <button class="btn btn-outline-light btn-sm" (click)="logout()">
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
- El icono de chat lleva un badge con el **número real** de mensajes sin leer (suma de `unreadCount` de
  todas las conversaciones, no solo "hay alguno") cuando ese total es mayor que 0, con el patrón
  estándar de Bootstrap de badge posicionado (`position-relative` en el botón + `position-absolute
  top-0 start-100 translate-middle` en el badge) — no inventes un badge con estilos propios. Colores
  `bg-white text-dark`, no `bg-secondary` (rojo Carmine): bug real reportado por la usuaria — contra el
  degradado naranja→rojo de la propia cabecera, un punto rojo casi no se distinguía, y tampoco decía
  cuántos mensajes había. `bg-secondary` sigue siendo el color correcto para badges de no-leídos sobre
  fondos claros (p. ej. la fila de cada conversación en `features/chats`, ver más abajo) — el problema
  era específico de este badge, sobre este fondo degradado, no una regla general a cambiar en todas
  partes.
- El botón "Cerrar sesión" lleva un `[attr.title]` con el email de la sesión activa (pedido explícito
  de la usuaria, 2026-08-20: ver el correo con el que se ha iniciado sesión, sin ir a Configuración).
  Es un `title` nativo del navegador, no un tooltip propio: Bootstrap no tiene su JS de tooltips
  cargado en este proyecto (decisión 3c-bis de `design.md`), y un tooltip por hover tampoco sería
  accesible en móvil de todos modos — por eso este `title` es solo un atajo adicional para quien usa
  ratón, y el campo no editable de Configuración (ver más abajo) sigue siendo la fuente accesible en
  cualquier dispositivo.
- `<main class="container py-4 py-md-5">` es el único punto donde cada feature inyecta su contenido.
  Ninguna pantalla autenticada debería envolver su contenido en su propio `container` adicional — ya lo
  provee el shell.
- El fondo de la cabecera es el degradado de marca (`navbar-dark shell-navbar`), no blanco liso — mismo
  degradado que Shell B y el selector de foto de completar perfil. El cuerpo (`<main>`) sigue en blanco.
  Valores exactos, el porqué de `navbar-dark` + el override de `.btn-link`, y `btn-outline-light` en vez
  de `btn-outline-dark` para el botón de logout: ver `references/design-tokens.md`, sección "Shell A:
  cabecera de la aplicación autenticada".

### Shell B — Pantallas públicas de autenticación (`features/auth`)

Usado por: login, registro paso 1 (email/contraseña — no confundir con "completar perfil", que es Shell
A), forgot password, reset password.

**Rediseño (sustituye a la card centrada sobre fondo claro de versiones anteriores)**: las 4 pantallas
ocupan toda la ventana con el **degradado de marca a pantalla completa** (`linear-gradient(160deg,
#FB8500 0%, #BE1E2D 100%)`), sin card blanca de por medio — el formulario flota directamente sobre el
degradado. El marcado y CSS exactos están en `references/design-tokens.md`; el esqueleto es:

```html
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-3" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true">
    <!-- 5 <path> del logo — copia el bloque completo de references/design-tokens.md -->
  </svg>
  <!-- Solo en login: <h1 class="h3 text-white mb-4">AfinIA</h1> -->
  <!-- En registro/recuperar/nueva contraseña: título propio de la pantalla en vez del wordmark, ver design-tokens.md -->
  <div class="w-100" style="max-width: 360px;">
    <!-- contenido específico: formulario de login / registro / forgot / reset -->
  </div>
</div>
```

Por qué es así: las 4 pantallas de `features/auth` son estados de un mismo flujo (nadie ve dos a la vez,
y visualmente deberían sentirse como el mismo fondo cambiando de contenido, no como 4 diseños distintos).
No lleva navbar porque todavía no hay sesión que cerrar ni configuración que abrir. Reglas específicas de
este shell:
- El logo (blanco) aparece en las 4 pantallas; **solo login** añade debajo el wordmark "AfinIA" — el
  resto muestra en su lugar un título propio de esa pantalla ("Registro", "Recuperar contraseña", "Nueva
  contraseña").
- Los `form-control` mantienen fondo claro/blanco (nunca transparentes sobre el degradado — perderían
  legibilidad), pero las etiquetas/enlaces/texto suelto de esta pantalla van en blanco
  (`text-white`/`text-white-50`), no en `$body-color` como en Shell A. **Esto incluye los mensajes de
  validación** (`.invalid-feedback`, p. ej. "Mínimo 8 caracteres"): bug real reportado por la usuaria
  con captura (2026-08-20) — se quedaron en el rojo por defecto de Bootstrap, casi ilegibles sobre el
  propio degradado naranja→rojo de esta pantalla (rojo sobre naranja/rojo es el peor caso de contraste
  posible). Cualquier texto suelto nuevo que se añada a Shell B debería revisarse contra esta misma
  regla antes de asumir que el rojo/gris por defecto de Bootstrap funciona aquí.
- El botón principal de estas 4 pantallas sigue la misma regla que el resto de la app — ver "Sistema de
  botones" más abajo (`btn-dark`, no `btn-primary`).
- Copys y estructura exactos de cada una de las 4 pantallas: `references/design-tokens.md`.

## Sistema de color y tipografía (branding)

Bootstrap da la estructura, pero el aspecto visual de la app no es el azul/gris por defecto de
Bootstrap — tiene una paleta e identidad tipográfica propias, que deben aplicarse igual en las 8
pantallas:

- **Paleta de color** (5 colores base, sin excepciones ni tonos "de más" inventados por pantalla):
  - `#FB8500` (naranja "Princeton") → color **primario** de marca: elementos activos/seleccionados
    (píldoras de cualidad marcadas, burbuja propia del chat), acentos, insignias, degradado de fondo de
    Shell B. **Ya no es el color de relleno del botón principal** — ver "Sistema de botones" más abajo:
    ese rol pasó a `btn-dark`.
  - `#BE1E2D` (rojo "Carmine") → estados hover/active del primario, acento secundario (icono de racha,
    extremo más intenso del gradiente de bloques del cuestionario, extremo del degradado de fondo de
    Shell B). **No lo uses para `btn-outline-secondary`** — ver la nota en "Sistema de botones" más
    abajo: al ser rojo, un botón outline con este color se lee como una acción destructiva, no como una
    acción neutra.
  - `#000000` (negro) → texto principal, superficies oscuras y **relleno del botón principal de toda la
    app** (`btn-dark`, ver "Sistema de botones"). El negro puro es un color de marca deliberado (extremo
    del gradiente del bloque de mayor peso, botón de acción principal), no una concesión que evitar.
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

**Pantalla de bienvenida previa, solo en modo creación** (ver decisión 3h de `design.md`): antes del
bloque 1, la primera vez que alguien entra al cuestionario ve una única pantalla de transición — mismo
fondo degradado que Shell B/landing, título "Cuestionario de compatibilidad", una frase invitando a
responder con calma, botón "Iniciar" — no arranca directo en el bloque 1. En **modo edición** (llegando
desde el botón "Editar tus respuestas" de Configuración, ver más abajo) esta pantalla se omite por
completo: se entra directo al bloque en el que se dejó, ya prerellenado.

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
- **Dentro del bloque activo, las 6 preguntas no van apiladas verticalmente ni en pestañas**: cada
  pregunta ocupa **toda la pantalla**, una a la vez (ya no `NgbNav`). La navegación entre las 6
  preguntas del bloque activo es una fila de **6 puntos + flechas prev/next** debajo de la pregunta —
  mismo lenguaje visual que la barra de progreso por bloques, un nivel más abajo: cada punto refleja si
  esa pregunta ya está respondida (relleno) o no (vacío), y **es clicable para saltar directo a ella**,
  con la misma regla de los segmentos de bloque (solo puedes saltar a preguntas ya visitadas dentro de
  ese bloque; las flechas avanzan/retroceden de una en una sin esa restricción). Cambiar de pregunta
  anima el contenido con una transición sutil (fade + desplazamiento horizontal corto, ~200ms,
  `ease-out`) en vez de un cambio brusco — los valores exactos de la transición están en
  `references/design-tokens.md`, igual que el resto de tokens. Respeta `prefers-reduced-motion`: sin la
  transición animada para quien la tenga desactivada, el cambio de pregunta sigue funcionando igual.
- El `<textarea>` de cada pregunta ocupa **todo el ancho de la card** (`w-100`/`form-control`, nunca un
  ancho fijo en píxeles ni una columna estrecha) y tiene altura suficiente para previsualizar **al menos
  4 líneas de texto** (`rows="4"` como mínimo) — no un campo de una sola línea. Respuestas más largas
  siguen siendo editables con scroll/resize dentro del propio `textarea`, pero el tamaño de partida debe
  invitar a escribir una respuesta con cierto desarrollo, no dar la sensación de un campo corto.
- **Navegar entre bloques es libre, no exige haber terminado el actual**: la persona puede pulsar el
  botón de bloque siguiente (icono de doble chevron junto a los puntos de pregunta, sección 21b —
  tooltip/aria-label "Bloque siguiente") con preguntas sin responder y volver más tarde — el envío
  final (`POST /users/me/questionnaire`, ver spec `personal-questionnaire`) sigue siendo el único
  punto que exige las 36 respuestas completas; el wizard es solo la forma de navegar la entrada de
  datos, no cambia esa regla de validación. El borrador se sigue guardando en BD, no en
  `localStorage` (decisión 5c).
- **Revisar un bloque anterior no te "atasca" ahí, pero tampoco te devuelve solo al más avanzado**: el
  estado distingue el bloque que se está viendo (`currentBlockIndex`) del bloque más avanzado al que ya
  llegaste (`maxReachedBlockIndex`) — `maxReachedBlockIndex` sigue existiendo (lo necesita la barra de
  progreso para saber qué tramos son clicables), pero el botón de bloque siguiente junto a los puntos ya
  **no** tiene un comportamiento especial al revisar: siempre dice "Bloque siguiente" y siempre avanza al
  inmediato siguiente, se esté revisando o no (desactivado a petición expresa — antes saltaba directo al
  más avanzado). Para saltar directo a un bloque concreto ya alcanzado, sigue estando el propio tramo de
  la barra de progreso.
- El paso del bloque activo sigue el patrón container+card normal (ver más abajo): la card lleva un
  `card-header` con el gradiente de ese bloque (título del bloque, sin el peso como texto, más la
  insignia si ya está completo) y un `card-body` con la pregunta activa + `textarea` + navegación de
  puntos flanqueada por los dos botones de bloque anterior/siguiente (mismo punto visual, icono
  visualmente distinto — doble chevron en vez de uno simple), en fondo claro/blanco para que el texto
  siga siendo legible. El `card-footer` **solo se muestra en el último bloque** (sección 21b — antes
  hacía doble función de "Siguiente bloque" Y envío final, confuso porque cambiaba de golpe al llegar
  al bloque 6): ahora es únicamente la acción de envío/guardado, cuyo texto depende solo del modo
  (creación/edición), nunca de si se avanza o se revisa — eso ya no vive aquí.
- Ya no uses `NgbAccordion` para los 6 bloques — implicaría tenerlos todos montados (aunque colapsados) a
  la vez, justo lo que este patrón evita. Usa un estado simple (`currentBlockIndex` +
  `maxReachedBlockIndex`) y renderiza solo la card del bloque activo. Dentro del bloque, tampoco uses
  `NgbNav` — el mismo par de signals aplicado un nivel más abajo (`currentQuestionIndex` +
  `maxReachedQuestionIndex`, con alcance local al bloque activo) resuelve la navegación de puntos +
  flechas de la pregunta activa.

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
  su punto en la navegación de preguntas (`question-nav__dot`) pasa a rellena (`$primary`) con la
  animación `tab-icon-pop` (scale 1→1.3→1) de `references/design-tokens.md`.
- **Banner de cierre** al llegar a 36/36 (aparece en el paso del bloque 6, encima de la card, nunca
  sustituyéndola): usa el gradiente de ese mismo bloque (`linear-gradient(135deg, #BE1E2D, #000000)`,
  reutilizado — no es un color nuevo), texto blanco, icono `bi-stars` y el mensaje fijo "¡Cuestionario
  completo! Ya puedes enviarlo." Es informativo: el botón real de envío sigue siendo el del
  `card-footer`, el banner no lo sustituye ni lo deshabilita.
- Todas las animaciones de esta sección respetan `prefers-reduced-motion` con el mismo criterio que la
  transición de preguntas: sin el efecto animado, el cambio de estado (insignia, punto, banner) sigue
  ocurriendo igual, solo sin la animación.

## Completar perfil (registro paso 2): wizard de 2 pasos

Sobre el mockup, esta pantalla (Shell A, caso especial — ver arriba) ya no es un formulario único: son
**2 pasos con paginación por puntos** (2 puntos debajo del contenido, el actual relleno). Es una
división de **cliente únicamente** — sigue habiendo un solo `POST /users/me/profile` al terminar el
paso 2, no un endpoint por paso:

- **Paso 1**: foto (circular, con preview al subir) + "Subir foto", nombre completo, alias (con
  validación en vivo contra `GET /users/check-alias`). Botón "Siguiente" — solo avanza de paso, no
  envía nada al backend. Deshabilitado mientras alias/nombre/foto no sean válidos.
- **Paso 2**: las 5 píldoras de cualidad (ver "Sistema de botones..." más abajo). Botón "Finalizar" —
  este es el que dispara el envío real a `POST /users/me/profile` con los datos de ambos pasos juntos.
  Deshabilitado mientras la selección no sea exactamente 5.

Los 2 puntos de paginación son solo indicador de posición (no clicables como los de la barra del
cuestionario — con 2 pasos y validación secuencial no hay "revisar un paso saltando por delante" que
resolver). El marcado exacto está en `references/design-tokens.md`.

## Pantalla de procesamiento (`features/processing`)

Entre el envío del cuestionario y el dashboard, esta pantalla (Shell A) sondea
`GET /users/me/comparisons` mientras las hasta 3 comparaciones siguen sin terminar. Sigue el patrón
container+card estándar, con este contenido en el `card-body`:

- Spinner centrado (`spinner-border text-primary`, mismo patrón que el estado de "cargando" del resto
  de la app).
- Debajo, una lista con una fila por candidato ya seleccionado (foto/alias + icono de estado:
  pendiente/analizando, `bi-check-circle-fill` si `completed`, `bi-exclamation-triangle` si `error`).
- **Nunca un porcentaje ni un contador "1 de 3"**: el orden de finalización entre comparaciones no es
  predecible (no todas tardan lo mismo), así que un porcentaje sugeriría una duración estimable que no
  existe — el refuerzo visual aquí es "qué candidatos ya están listos", no "cuánto queda".

El polling se detiene en cuanto todas las comparaciones existentes están en `completed`/`error`, y
entonces navega automáticamente al dashboard — no hace falta un botón "continuar" manual.

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

## Configuración y Chats: cierre explícito ("×") sobre la pantalla principal

`features/settings`, `features/chats` y `features/chats/:id` (las 3 pantallas descritas en las dos
secciones siguientes) llevan un botón de **cierre explícito ("×")** que navega a la pantalla
principal, en vez de sentirse como una pantalla más entre las que hay que "volver atrás" a mano.
Decisión tomada a partir de feedback explícito de la usuaria (2026-08-19): estas 3 son *acciones
puntuales* sobre el flujo principal (editar tu perfil, revisar un chat), no destinos permanentes como
el propio dashboard.

**Es SOLO un restyle visual, no un cambio de arquitectura**: las 3 siguen siendo rutas reales de
Shell A con sus guards sin cambios (`profileGuard` + `questionnaireCompletedGuard`, ver
`app.routes.ts`), montadas por el `<router-outlet>` de `core/shell` exactamente igual que antes —
deep-linking, botón atrás del navegador y guards siguen funcionando tal cual. Se consideró
`NgbModal` de `@ng-bootstrap/ng-bootstrap` (ya es dependencia del proyecto) como forma de abrir estas
pantallas y se descartó a propósito: perdería esa navegabilidad real sin necesidad. Bootstrap tampoco
tiene su JS de modales cargado en este proyecto (decisión 3c-bis de `design.md`), así que un modal
"de verdad" habría exigido JS propio de todos modos.

**Decisión revisada (2026-08-19, tras verlo en producción)**: la primera versión iba más lejos —
backdrop oscurecido a pantalla completa con una card centrada flotando encima, imitando un diálogo de
verdad. Dos problemas reales llevaron a simplificarlo: (1) como estas rutas SIGUEN sustituyendo a la
anterior en el `<router-outlet>` (nunca la mantienen montada de fondo — ver el párrafo anterior), no
había nada real que mostrar detrás del backdrop; se veía como un gris plano sin sentido en vez de la
pantalla principal atenuada. (2) La card, centrada dentro de un backdrop a pantalla completa, podía
quedar parcialmente escondida detrás de la propia cabecera de `core/shell` (bug real de
posicionamiento). Con eso, se optó por lo más simple: el panel ocupa **todo el ancho de `<main>`,
como cualquier otra pantalla de Shell A** — la "×" es la única señal de que se puede "cerrar".

El envoltorio compartido es `shared/modal-panel/modal-panel.component.ts` (`<app-modal-panel>`): una
`card` normal — sin backdrop, sin centrado propio, sin ancho máximo — con una franja `card-header` de
título+cierre cuando se le pasa `title` (Configuración, Chats); sin él (conversación de chat, que ya
tiene su propia cabecera contextual), el contenido proyectado lleva su propio cierre en su propia
cabecera. Marcado exacto en `references/design-tokens.md`.

## Chat interno: botón en la card de compatibilidad, listado y conversación

Tres piezas de UI para la capability `internal-chat` (ver `design.md` decisión 9):

- **Botón "Chatear" en cada card del dashboard**: junto al resto de acciones de la card (ver
  `results-dashboard`), `btn btn-dark btn-sm` con icono `bi-chat-dots` que llama a
  `POST /conversations` con el candidato de esa card y navega a `features/chats/:id` con la conversación
  devuelta (nueva o ya existente — el backend es idempotente, la UI nunca decide si crear o reutilizar).
- **`features/chats` (listado)**: envuelto en el modal de la sección anterior (`title="Chats"`); dentro,
  un `list-group` (no un formulario) con una fila por conversación — foto/alias del otro participante,
  último mensaje (truncado) y su fecha, más un punto de no leído si aplica. Ordenado por actividad más
  reciente. Sin card-footer (no hay una acción "principal" del listado en sí).
- **`features/chats/:id` (conversación)**: **excepción al patrón container+card estándar**, igual que el
  dashboard o el cuestionario — y, a diferencia de Configuración/Chats, envuelta en el modal **sin**
  `title` (ver sección anterior): ya tiene su propia cabecera contextual, así que el cierre del modal se
  añade ahí mismo en vez de en una segunda franja. `card-header` con foto/alias del otro participante y
  una flecha de volver al listado; `card-body` con scroll propio (`overflow-y: auto`, altura fija en
  CSS, nunca `height: 100vh` a pelo) mostrando los mensajes en orden cronológico; `card-footer` con un
  `<input>`/`form-control` de texto + botón de enviar (icono `bi-send`, `btn-dark`) — es el único
  "formulario" real de esta pantalla.

Mensajes propios alineados a la derecha en `$primary` con texto blanco; mensajes del otro participante a
la izquierda en un fondo neutro claro con texto oscuro — es el único sitio de la app con "burbujas" de
chat, así que necesita CSS propio (no hay una clase de Bootstrap equivalente); el marcado y CSS exactos
están en `references/design-tokens.md`. Los mensajes largos hacen `word-break` dentro de la burbuja, sin
generar scroll horizontal en ningún viewport (ver sección de responsive).

## Configuración: perfil, cuestionario y contraseña

`features/settings` (envuelta en el modal de la sección anterior, `title="Configuración"`) tiene **3
cards independientes** apiladas (`.mb-4` entre ellas) — no 3 secciones dentro de un mismo `card-body`,
a pesar de lo que decía una versión anterior de este documento: son 3 acciones de guardado
independientes (perfil, cuestionario, contraseña), cada una con su propio `card-footer`/botón/estado de
error, a diferencia del resto de pantallas de Shell A que editan una única entidad de una vez (ver
`references/page-template.md`, "Casos especiales"). Orden en pantalla — **Perfil → Cuestionario →
Contraseña** (feedback explícito de la usuaria, 2026-08-19: el cuestionario va antes que cambiar la
contraseña, no al final):

1. **Perfil**: **email de la sesión activa** (primer campo, no editable — `form-control-plaintext` +
   `readonly`, no un `<p>`/`<span>` suelto — pedido explícito de la usuaria, 2026-08-20: no hay ningún
   flujo de "cambiar email" en esta app), nombre, alias (validación en vivo) y las píldoras de cualidad
   (`shared/quality-pill`, mismo tope de 5 que el registro) — botón "Guardar cambios" (`btn-dark`) al
   final de esta sección. Al
   guardar con éxito (si la selección de cualidades cambió, lo que marca `needs_recalculation = true`),
   aparece un `alert alert-warning` con un botón **"Recalcular compatibilidad ahora"**
   (`btn-outline-dark btn-sm`) que llama directo a `POST /users/me/recalculate` y navega al dashboard —
   sin obligar a ir antes al dashboard a buscar ese botón.
2. **Cuestionario**: muestra un resumen (p. ej. "Respondido el 12/03/2026") y un botón **"Editar tus
   respuestas"** (`btn-outline-dark`) que **navega** a `features/questionnaire` en modo edición (ruta
   real, ver decisión 3h de `design.md` — no despliega las 36 preguntas dentro de la propia pantalla de
   configuración). En modo edición se omite la pantalla de bienvenida (ver "Cuestionario" más arriba) y
   se entra directo al wizard ya prerellenado. El botón del `card-footer` del bloque 6, en este modo, no
   dice "Enviar cuestionario" sino **"Guardar y recalcular compatibilidad"**: encadena en una sola
   acción `PATCH /users/me/questionnaire` seguido de `POST /users/me/recalculate`, y navega al
   dashboard ya refrescado — sin volver antes a Configuración ni al dashboard a buscar un botón aparte.
3. **Contraseña**: contraseña actual + nueva (con reautenticación, decisión 7b) — botón "Cambiar
   contraseña" (`btn-outline-dark`, es una acción independiente de "Guardar cambios").

**El dashboard ya NO tiene su propio botón de recalcular** (retirado a petición explícita de la usuaria,
2026-08-19 — ver `openspec/changes/archive/*-simplify-dashboard-recalculate`): la decisión original 5b
de `design.md` lo ponía ahí, siempre visible pero casi siempre deshabilitado (solo se activa si el
perfil está pendiente de recalcular), lo que resultaba redundante con estos dos atajos de Configuración,
que SÍ llaman directo a `POST /users/me/recalculate` por su cuenta (sin depender de ningún botón del
dashboard) y navegan allí ya con los resultados en marcha. El marcado exacto de la sección de
cuestionario y de ambos atajos está en `references/design-tokens.md`.

## Sistema de botones, iconos y formularios

No inventes un patrón nuevo por pantalla para estas cosas — reutiliza siempre el mismo:

- **Botón principal de una pantalla/card** (enviar, guardar, continuar, recalcular, iniciar sesión,
  crear cuenta, chatear, enviar mensaje): `btn btn-dark` — **ya no `btn-primary`**. Este es un cambio
  transversal a toda la app (no solo a Shell B): el naranja `$primary` deja de usarse como relleno de
  botón y queda reservado para acentos/estados-seleccionados (ver paleta más arriba); el negro es ahora
  el único color de relleno para la acción principal, en cualquier pantalla y fondo. Solo debe haber uno
  por card como acción "principal".
- **Acción secundaria** (cancelar, volver, "¿olvidaste tu contraseña?"): `btn btn-outline-dark`
  o `btn btn-link` si es más un enlace que una acción. **No uses `btn-outline-secondary`**: desde el
  cambio de paleta `$secondary` es el rojo Carmine, y un botón outline en rojo se lee como una acción
  destructiva, no como una acción secundaria neutra. Al ser ahora ambos "dark" (principal en sólido,
  secundario en outline), la jerarquía sigue siendo clara por el relleno, no por el color.
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
  Cuando el requisito no es evidente por sí solo (p. ej. la fortaleza de una contraseña nueva, ver
  más abajo), añade además un `.form-text` con el MISMO texto justo debajo del control, siempre
  visible — no obligues a fallar primero para enterarse de la regla.
- **Contraseñas nuevas** (registro, "nueva contraseña" tras recuperación, "nueva contraseña" de
  Configuración — nunca la contraseña ACTUAL que se reautentica en Configuración): mínimo 8
  caracteres, mayúscula, minúscula y carácter especial (endurecido 2026-08-20, a petición explícita
  de la usuaria — antes solo exigía 8 caracteres). Un único validador compartido
  (`shared/password-validators.ts`), no uno por pantalla — endurecer solo en el alta y dejarlo más
  débil al cambiar/recuperar no tendría sentido. Detalle completo (por qué Unicode-aware, el texto
  exacto, dónde va el `.form-text`): `references/design-tokens.md`, "Requisitos de contraseña".
- **Píldoras seleccionables** (las 15 cualidades en registro paso 2/configuración, ver decisión 3d de
  `design.md` — **rediseño: sustituye a las cards con insignia de check de versiones anteriores**): cada
  cualidad es una píldora/chip compacto (`rounded-pill`), no una card en grid. Sin seleccionar: fondo
  gris claro, texto oscuro. Seleccionada: fondo `$primary` (naranja), texto blanco — sin icono de check
  superpuesto, el propio cambio de color ya comunica "seleccionada". **Mismo comportamiento que antes,
  solo cambia el estilo**: tope de 5 en la propia interacción (en cuanto hay 5 marcadas, las píldoras no
  marcadas quedan `disabled` hasta que se desmarca alguna; desmarcar siempre está permitido). Sigue
  siendo un `<button>` con `[attr.aria-pressed]`, nunca un `<div>` con solo un `(click)`. El marcado
  exacto está en `references/design-tokens.md`. El mismo componente debe reutilizarse en registro paso 2
  **y** en configuración — no dupliques el marcado en los dos sitios, extrae un componente compartido
  (`shared/quality-pill` o similar).

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
      visitado (flecha de cabecera o clic en su segmento de la barra), y el botón de bloque siguiente
      junto a los puntos de pregunta mantiene siempre el mismo comportamiento lineal (avanza al
      inmediato siguiente), sin un salto especial al más avanzado al estar revisando?
- [ ] Si la pantalla es el cuestionario: ¿los refuerzos de gamificación (racha, insignia de bloque,
      banner final) usan solo colores de la paleta ya definida y no cambian la regla de que hacen falta
      las 36 respuestas para enviar?
- [ ] ¿Ningún botón "neutro" (secundario o logout) usa `btn-outline-secondary`? Desde el cambio de
      paleta ese color es rojo y se lee como destructivo — usa `btn-outline-dark`.
- [ ] ¿El botón de acción principal usa `btn-dark`, no `btn-primary`? El naranja `$primary` ya no es
      color de relleno de botón en ninguna pantalla, solo acento/estado-seleccionado.
- [ ] Si la pantalla tiene píldoras de cualidades: ¿las no seleccionadas se deshabilitan al llegar a 5
      marcadas (no se puede marcar una sexta), permitiendo siempre desmarcar?
- [ ] Si la pantalla es Shell A: ¿el icono de chat aparece a la izquierda de Configuración (chat,
      configuración, logout, en ese orden), y ambos (chat + configuración) están ausentes en la pantalla
      de completar perfil?
- [ ] Si la pantalla es Shell A: ¿el logo/"AfinIA" de la cabecera es un enlace real a `/` (no un `<span>`
      decorativo), con el mismo hover/focus que el resto de la cabecera?
- [ ] Si la pantalla es una conversación de chat: ¿los mensajes propios y los del otro participante se
      distinguen por alineación/color (no solo por texto), y el área de mensajes tiene scroll propio en
      vez de hacer crecer toda la página?
- [ ] Si la pantalla es el cuestionario: ¿la pantalla de bienvenida solo aparece en modo creación (nunca
      en modo edición), y el botón del bloque 6 dice "Guardar y recalcular compatibilidad" en edición
      encadenando el `PATCH` con `POST /users/me/recalculate`, en vez de "Enviar cuestionario"?
- [ ] Si la pantalla es Configuración: ¿el botón "Editar tus respuestas" navega al cuestionario en modo
      edición (no lo despliega inline), y el guardado de perfil/cualidades ofrece un atajo de recalcular
      sin obligar a ir antes al dashboard?

Si la respuesta a alguna de estas preguntas es "no" y no hay una razón concreta para la excepción,
corrígelo antes de considerar la pantalla terminada — y si la razón para la excepción existe, dila en
voz alta (coméntala al usuario o en el PR) en vez de dejar la desviación sin explicar.

## Ver también

- `openspec/changes/archive/2026-08-18-build-compatibility-mvp/design.md` — decisiones 3c-bis
  (Bootstrap como sistema de diseño), 3c-ter (responsive), 3c-quater (paleta, tipografía, botón
  oscuro, Shell B degradado y wizard del cuestionario), 3d/3d-bis (píldoras de cualidades), 3e
  (completar perfil en 2 pasos), 3f (pantalla de procesamiento), 3g (landing pública), 3h (bienvenida
  del cuestionario y recálculo integrado) y 9 (chat interno) son la fuente de la que sale esta skill;
  el cambio ya está archivado (166/166 tareas), pero el fichero sigue documentando el porqué de cada
  decisión — si algo de esto cambiara, esta skill debe actualizarse a la vez.
- `openspec/specs/internal-chat/spec.md` — requisitos formales vigentes del chat (elegibilidad, acceso
  desde el menú, no leídos) que la UI descrita aquí debe cumplir.
- `references/page-template.md` — plantilla de partida copy-paste para arrancar un componente de
  pantalla nuevo ya con la estructura correcta.
- `references/design-tokens.md` — valores exactos de color/tipografía, el snippet de Sass para
  recompilar Bootstrap con ellos, y la tabla de gradientes por peso de los 6 paneles del cuestionario.
