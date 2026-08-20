# Tokens de diseño: color, logo, tipografía y wizard del cuestionario

Valores exactos — cópialos, no los aproximes ni los reinventes por pantalla.

## Paleta de color

| Token | Hex | Uso |
|---|---|---|
| `$primary` | `#FB8500` (Princeton Orange) | Acentos de marca: enlaces activos, insignia de bloque completado, píldora de cualidad seleccionada, burbuja propia del chat, extremo del degradado de Shell B. **Ya no es el color de relleno de ningún botón** — ver fila `$dark` y `SKILL.md` ("Sistema de botones") |
| `$secondary` | `#BE1E2D` (Carmine) | Hover/active del primario, icono de racha, extremo más intenso del gradiente de bloques y del degradado de Shell B. **No lo mapees a `btn-outline-secondary`/logout** — ver `SKILL.md` |
| `$dark` / `$body-color` | `#000000` (negro) | Texto principal, superficies oscuras, extremo del gradiente del bloque más pesado, y **relleno del botón de acción principal en toda la app** (`btn-dark` — rediseño que sustituye a `btn-primary` naranja como color de botón) |
| `$light` (superficie alterna) | `#FDF0D5` (Papaya Whip) | Fondos suaves de sección, extremo "frío" del gradiente de bloques |
| — (sin variable Sass dedicada, es el blanco base de Bootstrap) | `#FFFFFF` | Fondo de cards/superficies claras, otro extremo frío del mismo gradiente, y color fijo del logo sobre el degradado de Shell B |

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
// apps/frontend/src/styles.scss — GLOBAL, no en brand-mark.component.scss (ver por qué debajo)
.brand-mark {
  fill: currentColor; // hereda el color de texto del contenedor — nunca un color fijo aquí
  width: 28px;
  height: 28px;
}

// Shell B (fondo degradado): color fijo en blanco, no currentColor — el fondo ahí nunca es blanco
.brand-mark--white {
  fill: #FFFFFF;
  width: 48px;
  height: 48px;
}
```

**Estas dos clases van en `styles.scss` global, NUNCA en `brand-mark.component.scss`** — descubierto
como bug real en el navegador implementando la landing (sección 11d): el `ViewEncapsulation.Emulated`
por defecto de Angular hace que el CSS de un componente solo aplique a los elementos de SU PROPIA
plantilla. `<app-brand-mark>` (usado tal cual en `core/shell`) no necesita nada más, pero **Shell B
(login/registro/forgot/reset, sección 12) y la landing inlinean el SVG a mano** en su propia plantilla
en vez de usar `<app-brand-mark>` — la landing porque cada `<path>` necesita su propia clase de
animación escalonada, Shell B porque copia el bloque `<svg>` de la sección "Shell B" de este documento
tal cual. Un SVG inlineado así solo hereda `fill`/tamaño si estas clases son globales; si viven en el
componente, el logo sale con el negro por defecto de un `<path>` sin `fill` propio.

`.brand-mark--accent` (naranja sobre card blanca) queda **obsoleta** — era la variante de Shell B antes
del rediseño a fondo degradado a pantalla completa (ver sección siguiente). No la reintroduzcas.

### Assets de origen y favicon

Los 4 SVG originales (variante gris de un color, variante blanca de arriba, y los dos favicons con fondo
cuadrado redondeado) están en `docs/brand/` del repo — ver `docs/brand/README.md` para el mapeo exacto.
El favicon (`docs/brand/favicon-positivo.svg` — fondo blanco, marca con degradado; y
`favicon-negativo.svg` — fondo con degradado, marca blanca) es un asset distinto del `brand-mark`: no es
inline ni hereda color, es un fichero de icono cuadrado que se referencia tal cual desde `index.html`
(`<link rel="icon">`) y desde los assets de PWA/manifest si el proyecto llega a tenerlos. Pendiente de
decidir con Estela cuál de las dos variantes usar como favicon real del navegador y en qué tamaños
exportarlo a PNG/ICO — no asumas una por defecto.

## Landing pública (`/`)

```html
<!-- apps/frontend/src/app/features/landing/landing.component.html -->
<div class="auth-shell landing-hero d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white landing-mark mb-3" viewBox="0 0 345.3 336.08" width="64" height="64" aria-hidden="true">
    <path class="landing-mark__p1" d="..." />
    <path class="landing-mark__p2" d="..." />
    <path class="landing-mark__p3" d="..." />
    <path class="landing-mark__p4" d="..." />
    <path class="landing-mark__p5" d="..." />
    <!-- 5 <path> reales del logo, ver sección "Logo de marca" -->
  </svg>
  <h1 class="landing-title text-white mb-2">Conecta con quien realmente encaja contigo</h1>
  <p class="landing-sub text-white-75 mb-4">
    Responde un cuestionario de compatibilidad y elige las cualidades que te definen: una IA compara tus
    respuestas con las de otras personas para encontrar afinidades reales, no solo las que se ven a
    simple vista.
  </p>
  <button type="button" class="btn btn-dark landing-cta" routerLink="/auth/login">Iniciar sesión</button>
</div>
```

```scss
// apps/frontend/src/app/features/landing/landing.component.scss
.landing-hero {
  min-height: 100vh;
  background: linear-gradient(160deg, #FB8500 0%, #BE1E2D 100%);
  background-size: 200% 200%;
  animation: landing-gradient-shift 14s ease-in-out infinite;
}

@keyframes landing-gradient-shift {
  0%, 100% { background-position: 0% 30%; }
  50%      { background-position: 100% 70%; }
}

.landing-title {
  font-size: 1.6rem;
  font-weight: 700;
  max-width: 22ch;
  animation: landing-fade-up 500ms ease-out 620ms both;
}
.landing-sub {
  max-width: 34ch;
  font-size: 0.95rem;
  animation: landing-fade-up 500ms ease-out 760ms both;
}
.landing-cta {
  animation: landing-fade-up 500ms ease-out 900ms both;
}

@keyframes landing-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

// El logo se ensambla: cada uno de los 5 <path> aparece con fundido + escala, escalonados ~80ms
.landing-mark {
  @for $i from 1 through 5 {
    &__p#{$i} {
      opacity: 0;
      transform-origin: center;
      animation: quality-check-in 350ms ease-out #{($i - 1) * 80ms} both; // reutiliza el keyframe ya definido arriba
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-hero { animation: none; }
  .landing-title, .landing-sub, .landing-cta, .landing-mark [class^="landing-mark__"] {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

```ts
// apps/frontend/src/app/features/landing/landing.component.ts (esquema)
// Si ya hay sesión, no se muestra la landing — redirige a la misma resolución que la ruta autenticada
constructor(private auth: AuthService, private router: Router) {
  if (this.auth.hasSession()) {
    this.router.navigate(['/']); // el guard de la ruta autenticada resuelve cuestionario/dashboard
  }
}
```

Un único botón de CTA (`btn-dark`, no un color distinto por ser landing) hacia `/auth/login` — no
añadas un segundo botón (p. ej. a registro) salvo que se pida explícitamente; desde login ya se llega a
registro con el enlace existente.

## Shell B: pantallas de autenticación con fondo degradado

Valores exactos para el rediseño de Shell B descrito en `SKILL.md` (sustituye a la card centrada sobre
fondo claro). Las 4 pantallas comparten el mismo fondo y esqueleto; solo cambia el título y el contenido
del formulario.

```scss
// apps/frontend/src/app/core/auth-shell/auth-shell.component.scss — el degradado sí puede ir aquí
// (aplica al propio elemento de la plantilla de ESTE componente)
.auth-shell {
  min-height: 100vh;
  background: linear-gradient(160deg, #FB8500 0%, #BE1E2D 100%);
}
```

```scss
// apps/frontend/src/styles.scss — GLOBAL, NO en auth-shell.component.scss: si `AuthShellComponent`
// envuelve el formulario de cada pantalla vía `<ng-content>` (recomendado, para no repetir el
// degradado + logo 4 veces), ese formulario llega proyectado desde `LoginComponent`/
// `RegisterComponent`/etc. y conserva SU PROPIO encapsulamiento de vista — el CSS de
// `auth-shell.component.scss` no lo alcanza (mismo motivo exacto que `.brand-mark`/`.brand-mark--white`
// más arriba, bug real descubierto en la sección 11d/12). Inputs: fondo claro fijo para mantener
// legibilidad; texto/labels/enlaces en blanco alrededor de ellos.
.auth-shell .form-label,
.auth-shell .form-text,
.auth-shell a {
  color: #FFFFFF;
}

// Bug real reportado por la usuaria con captura (2026-08-20): `.invalid-feedback` (mensajes como
// "Mínimo 8 caracteres", "Las contraseñas no coinciden") se quedó fuera de la regla de arriba —
// seguía el rojo por defecto de Bootstrap (`$danger`, sin recompilar en este proyecto: solo
// `$primary`/`$secondary`/`$dark`/`$light`/`$body-color`/`$font-family-base` están overrideados, ver
// más abajo). Rojo sobre el propio degradado naranja→rojo de esta pantalla es el peor caso posible —
// contraste medido ~1.3-1.8:1 (WCAG AA exige 4.5:1 para texto normal). Mismo criterio que el resto de
// texto suelto de esta pantalla: blanco.
.auth-shell .invalid-feedback {
  color: #FFFFFF;
}
```

```html
<!-- Login -->
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-2" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true"><!-- ver arriba --></svg>
  <h1 class="h3 text-white mb-4">AfinIA</h1>
  <form class="w-100 text-start" style="max-width: 360px;">
    <div class="mb-3">
      <label class="form-label" for="email">Email</label>
      <input id="email" class="form-control" type="email" formControlName="email">
    </div>
    <div class="mb-3">
      <label class="form-label" for="password">Contraseña</label>
      <input id="password" class="form-control" type="password" formControlName="password">
    </div>
    <button type="submit" class="btn btn-dark w-100 mb-3">Iniciar sesión</button>
    <p class="small mb-1">¿No tienes cuenta? <a routerLink="/auth/register" class="fw-semibold">Regístrate</a></p>
    <p class="small mb-0"><a routerLink="/auth/forgot-password">¿Olvidaste tu contraseña?</a></p>
  </form>
</div>
```

```html
<!-- Registro (paso 1: email/contraseña — no confundir con "completar perfil", que es Shell A) -->
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-2" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true"><!-- ver arriba --></svg>
  <h1 class="h4 text-white mb-4">Registro</h1>
  <form class="w-100 text-start" style="max-width: 360px;">
    <div class="mb-3">
      <label class="form-label" for="email">Email</label>
      <input id="email" class="form-control" type="email" formControlName="email">
    </div>
    <div class="mb-3">
      <label class="form-label" for="password">Contraseña</label>
      <input id="password" class="form-control" type="password" formControlName="password">
      <!-- hint SIEMPRE visible (form-text) + mismo texto en invalid-feedback si no se cumple —
           requisitos endurecidos 2026-08-20, ver "Requisitos de contraseña" más abajo -->
      <div class="form-text">{{ passwordRequirementsMessage }}</div>
      <div class="invalid-feedback">{{ passwordRequirementsMessage }}</div>
    </div>
    <div class="mb-3">
      <label class="form-label" for="passwordConfirm">Repite la contraseña</label>
      <input id="passwordConfirm" class="form-control" type="password" formControlName="passwordConfirm">
    </div>
    <button type="submit" class="btn btn-dark w-100 mb-3">Crear cuenta</button>
    <p class="small mb-0">¿Ya tienes cuenta? <a routerLink="/auth/login" class="fw-semibold">Inicia sesión</a></p>
  </form>
</div>
```

```html
<!-- Recuperar contraseña (forgot password) -->
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-2" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true"><!-- ver arriba --></svg>
  <h1 class="h4 text-white mb-2">Recuperar contraseña</h1>
  <p class="small text-white-50 mb-4" style="max-width: 320px;">
    Si el email existe en nuestro sistema recibirás un enlace para restablecer tu contraseña.
  </p>
  <form class="w-100 text-start" style="max-width: 360px;">
    <div class="mb-3">
      <label class="form-label" for="email">Email</label>
      <input id="email" class="form-control" type="email" formControlName="email">
    </div>
    <button type="submit" class="btn btn-dark w-100 mb-3">Enviar contraseña</button>
    <p class="small mb-0">¿Ya tienes cuenta? <a routerLink="/auth/login" class="fw-semibold">Inicia sesión</a></p>
  </form>
</div>
```

```html
<!-- Nueva contraseña (reset password, con token de la URL) -->
<div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
  <svg class="brand-mark brand-mark--white mb-2" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true"><!-- ver arriba --></svg>
  <h1 class="h4 text-white mb-4">Nueva contraseña</h1>
  <form class="w-100 text-start" style="max-width: 360px;">
    <div class="mb-3">
      <label class="form-label" for="password">Contraseña</label>
      <input id="password" class="form-control" type="password" formControlName="password">
      <div class="form-text">{{ passwordRequirementsMessage }}</div>
      <div class="invalid-feedback">{{ passwordRequirementsMessage }}</div>
    </div>
    <div class="mb-3">
      <label class="form-label" for="passwordConfirm">Repite la nueva contraseña</label>
      <input id="passwordConfirm" class="form-control" type="password" formControlName="passwordConfirm">
    </div>
    <button type="submit" class="btn btn-dark w-100">Guardar nueva contraseña</button>
  </form>
</div>
```

### Requisitos de contraseña (endurecidos el 2026-08-20)

A petición explícita de la usuaria: además del mínimo de 8 caracteres, toda contraseña **nueva**
(registro, "nueva contraseña" tras recuperación, y el campo "nueva contraseña" de Configuración —
nunca la contraseña ACTUAL que se reautentica en Configuración, que no lleva este validador) exige
al menos una mayúscula, una minúscula y un carácter especial. Un único validador compartido
(`shared/password-validators.ts`, `passwordStrengthValidator` + `PASSWORD_REQUIREMENTS_MESSAGE`), no
uno distinto por pantalla: endurecer la contraseña solo al crear la cuenta y dejarla más débil al
cambiarla o recuperarla no tendría sentido.

```ts
// apps/frontend/src/app/shared/password-validators.ts (extracto)
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Mínimo 8 caracteres, con mayúscula, minúscula y un carácter especial.';

// \p{Lu}/\p{Ll} (mayúscula/minúscula Unicode) en vez de [A-Z]/[a-z]: una Ñ cuenta como mayúscula
// igual que una N. "Carácter especial" = ni letra unicode ni dígito ni espacio — no una lista
// cerrada de símbolos (evita rechazar algún símbolo válido no previsto) y, a la vez, evita que una
// tilde/eñe cuente como "especial" cuando en realidad es una letra normal.
```

El mismo texto (`PASSWORD_REQUIREMENTS_MESSAGE`) se usa en dos sitios a la vez bajo cada campo de
contraseña nueva — un `.form-text` siempre visible (para no obligar a fallar primero para enterarse
de las 4 condiciones) y el `.invalid-feedback` de siempre, que aparece además en rojo/blanco cuando
no se cumplen (ver "Shell B" más abajo para el color). No son dos mensajes distintos que puedan
desincronizarse: los dos leen de la misma constante.

Los 4 textos de botón/título de arriba están transcritos de una captura de mockup a baja resolución —
si al implementar el copy exacto difiere (p. ej. "Enviar contraseña" podría en realidad ser "Enviar
enlace"), el estilo/estructura no cambia, solo ajusta el texto del botón/título correspondiente.

## Shell A: cabecera de la aplicación autenticada

**Cambio de diseño confirmado con Estela**: la cabecera de Shell A (cuestionario, dashboard, chats,
configuración, completar perfil) lleva el mismo degradado de marca que Shell B (`auth-shell`) y el
selector de foto de completar perfil — antes era fondo blanco liso (`bg-white`), ya no. El cuerpo de
la pantalla, debajo de la cabecera, sigue en blanco en los dos casos — el degradado es solo de la
cabecera.

**El logo + "AfinIA" son un enlace a la pantalla principal** (decisión confirmada con Estela,
retomada y formalizada en `openspec/changes/archive/*-add-navbar-brand-home-link`): antes un `<span>`
puramente decorativo, sin ningún punto de entrada de vuelta a la pantalla principal desde
Configuración/Chats salvo el botón "Atrás" del navegador. Ahora es un `<a routerLink="/">` — navega a
`/` y deja que `mainRouteGuard` decida el destino real (cuestionario o dashboard según el estado del
usuario, spec `results-dashboard` "Enrutamiento de la página principal"), sin duplicar esa lógica de
prioridad en `ShellComponent`. Mismo patrón que ya usa `previousBlock()` del cuestionario (flecha de
la cabecera en el bloque 1).

```html
<!-- apps/frontend/src/app/core/shell/shell.component.html -->
<nav class="navbar navbar-expand-md navbar-dark shell-navbar sticky-top">
  <div class="container">
    <a class="navbar-brand d-flex align-items-center gap-2" routerLink="/" aria-label="Ir a la pantalla principal">
      <app-brand-mark />
      AfinIA
    </a>
    <!-- toggler + colapsable con los 3 botones (Chats/Configuración/Cerrar sesión), sin cambios -->
  </div>
</nav>
```

```scss
// apps/frontend/src/app/core/shell/shell.component.scss
.shell-navbar {
  background: linear-gradient(160deg, #FB8500 0%, #BE1E2D 100%);
}

// `navbar-dark` (en vez de `navbar-light`) ya adapta el icono del hamburger y el color base de
// `.navbar-brand` — pero "Chats"/"Configuración" son <button class="btn btn-link nav-link">, no
// <a class="nav-link">: `.btn-link` trae su propio color que no hereda de `navbar-dark`, así que hay
// que forzarlo aquí explícitamente (encontrado de verdad implementando esto, no algo hipotético).
.shell-navbar .btn-link {
  color: #FFFFFF;
}
.shell-navbar .btn-link:hover,
.shell-navbar .btn-link:focus {
  color: #FFFFFF;
  opacity: 0.85;
}

// El logo/"AfinIA" (`.navbar-brand`) ya hereda el color correcto de `navbar-dark` sin forzar nada —
// solo hace falta el mismo hover/focus que el resto de la cabecera, para que se note que es clicable.
.shell-navbar .navbar-brand:hover,
.shell-navbar .navbar-brand:focus {
  opacity: 0.85;
}
```

El botón "Cerrar sesión" pasa de `btn-outline-dark` a **`btn-outline-light`** (mismo patrón de
Bootstrap: variante de contorno clara para fondos oscuros/saturados, en vez de un color a mano) — sigue
siendo `btn btn-outline-light btn-sm`, sin más cambios. `border-bottom` (el borde gris que separaba el
navbar antiguo del cuerpo) se quita: el propio contraste de color entre el degradado y el cuerpo blanco
ya separa ambas zonas, un borde gris adicional no aporta nada ahí y desentonaría con el degradado.

**Alineación de los 3 botones en el menú móvil (bug real, feedback con captura, 2026-08-19)**: el
`<ul class="navbar-nav ms-auto ...">` salía alineado a la izquierda en el desplegable móvil, no a la
derecha (donde está el propio icono de hamburguesa). Causa: `.navbar-nav` es
`display: flex; flex-direction: column` por debajo de 768px (Bootstrap, `_navbar.scss`) — con
`align-items` en su valor por defecto (`stretch`), cada `<li>` ocupa el ancho completo del desplegable.
`ms-auto` no arregla esto: solo empuja el `<ul>` hacia la derecha cuando `.navbar-nav` es una fila
(`navbar-expand-md`, ≥768px) — en columna (móvil) no tiene ningún efecto visible.

Primer intento (`text-end`) **revertido — bug real encontrado verificando en producción**: `text-align`
solo reposiciona contenido `inline`/`inline-block` DENTRO de una caja, nunca la caja en sí.
"Chats"/"Configuración" usan `.nav-link` además de `.btn` (Bootstrap: `.nav-link` es
`display: block`), así que `text-end` no tenía ningún efecto en ellos — solo funcionaba para "Cerrar
sesión" (sin `.nav-link`, `.btn` normal = `display: inline-block`). Se cambió a **`align-items-end`**
en el mismo `<ul>` (clase final: `navbar-nav ms-auto align-items-md-center gap-2 align-items-end`):
repositiona el propio `<li>` (el flex item) en el eje transversal del contenedor flex, sea cual sea el
`display` de lo que haya dentro — vale para los 3 botones por igual. Inocuo en escritorio:
`align-items-md-center` ya sobrescribe `align-items` a partir de 768px (Bootstrap resuelve ese empate
de especificidad a favor de la utilidad responsive), y ahí `align-items` solo afecta a la alineación
vertical de una fila, no a la horizontal.

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

// Botones de bloque anterior/siguiente junto a los puntos de pregunta (sección 21b — sustituyen al
// antiguo botón único del footer, que hacía de "Siguiente bloque" Y de envío final a la vez).
previousBlockNav(): void {
  if (this.currentBlockIndex() === 0) {
    return;
  }
  this.enterBlock(this.currentBlockIndex() - 1);
}

// Siempre lineal (al inmediato siguiente), sea cual sea el bloque en el que se esté — el salto
// directo a "donde estabas" al revisar un bloque anterior se desactivó a petición expresa (antes
// saltaba directo a maxReachedBlockIndex en vez de avanzar de uno en uno). maxReachedBlockIndex
// sigue sin retroceder nunca (lo necesita la barra de progreso para saber qué tramos son clicables),
// pero ya no decide a dónde avanza este botón.
nextBlockNav(): void {
  if (this.isLastBlock()) {
    return;
  }
  const next = this.currentBlockIndex() + 1;
  if (next > this.maxReachedBlockIndex()) {
    this.maxReachedBlockIndex.set(next);
  }
  this.enterBlock(next);
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
    <!-- pregunta activa + textarea -->
    <div class="d-flex align-items-center justify-content-center gap-2 mt-3">
      <button type="button" class="btn btn-link p-0 text-secondary" [disabled]="currentBlockIndex() === 0"
              (click)="previousBlockNav()" aria-label="Bloque anterior" title="Bloque anterior">
        <i class="bi bi-chevron-double-left fs-5" aria-hidden="true"></i>
      </button>
      <!-- <app-question-nav>, ver "Navegación entre las 6 preguntas del bloque activo" más abajo -->
      <button type="button" class="btn btn-link p-0 text-secondary" [disabled]="isLastBlock()"
              (click)="nextBlockNav()" aria-label="Bloque siguiente" title="Bloque siguiente">
        <i class="bi bi-chevron-double-right fs-5" aria-hidden="true"></i>
      </button>
    </div>
  </div>
  <!-- El footer YA NO hace de "Siguiente bloque" (sección 21b) — solo se muestra en el último
       bloque, únicamente como acción final de envío/guardado -->
  <div class="card-footer bg-white d-flex justify-content-end" *ngIf="isLastBlock()">
    <button type="button" class="btn btn-dark" [disabled]="footerButtonDisabled()" (click)="onFooterButtonClick()">
      {{ footerButtonLabel() }}
    </button>
  </div>
</div>
```

`footerButtonLabel()` ya solo depende del modo (creación/edición — decisión 3h de `design.md`): el
propio `*ngIf="isLastBlock()"` del footer garantiza que esto nunca se lee fuera del último bloque, así
que no hace falta que el método distinga por bloque él mismo. El botón de bloque siguiente junto a los
puntos siempre dice/hace lo mismo ("Bloque siguiente", avanza al inmediato siguiente) sea cual sea el
bloque en el que se esté — el comportamiento especial "Volver a donde estabas" (saltar directo al más
avanzado al revisar uno anterior) se desactivó a petición expresa; el salto directo a un bloque concreto
sigue existiendo, pero solo desde los tramos de la barra de progreso (`goToBlock()`), no desde este
botón:

```ts
footerButtonLabel(): string {
  return this.mode === 'edit' ? 'Guardar y recalcular compatibilidad' : 'Enviar cuestionario';
}

footerButtonDisabled(): boolean {
  return !this.allAnswered(); // exige las 36, no solo las del bloque activo
}

async onFooterButtonClick(): Promise<void> {
  await this.submitLastBlock();
}

private async submitLastBlock(): Promise<void> {
  if (this.mode === 'edit') {
    await this.questionnaireService.update(this.answers()); // PATCH /users/me/questionnaire
    await this.matchingService.recalculate();                // POST /users/me/recalculate, encadenado
    this.router.navigate(['/dashboard']);
  } else {
    await this.questionnaireService.complete(this.answers()); // POST /users/me/questionnaire
    this.router.navigate(['/processing']);
  }
}
```

```scss
.question-block--weight-05 { background: linear-gradient(135deg, #FFFFFF, #FDF0D5); color: #000000; }
.question-block--weight-15 { background: linear-gradient(135deg, #FDF0D5, #FCD9A0); color: #000000; }
.question-block--weight-20 { background: linear-gradient(135deg, #FCD9A0, #FB8500); color: #000000; }
.question-block--weight-25 { background: linear-gradient(135deg, #FB8500, #DD5217); color: #000000; }
.question-block--weight-30 { background: linear-gradient(135deg, #BE1E2D, #000000); color: #FFFFFF; }
```

## Navegación entre las 6 preguntas del bloque activo (puntos + flechas)

Dentro del bloque activo, cada pregunta ocupa toda la pantalla (ya no pestañas `NgbNav`). La navegación
entre sus 6 preguntas es una fila de puntos + flechas prev/next, con el mismo patrón de "clic en el
punto = salto directo si ya lo visitaste" que la barra de progreso por bloques, aplicado un nivel más
abajo y con alcance local al bloque activo (se reinicia al entrar a un bloque distinto):

```html
<!-- apps/frontend/src/app/features/questionnaire/question-nav.component.html -->
<div class="d-flex align-items-center justify-content-center gap-3 mt-3">
  <button type="button" class="btn btn-link p-0 text-body" [disabled]="currentQuestionIndex() === 0"
          (click)="previousQuestion()" aria-label="Pregunta anterior" title="Pregunta anterior">
    <i class="bi bi-chevron-left fs-5"></i>
  </button>
  <div class="d-flex gap-2">
    @for (question of activeBlock().questions; track question.id; let qi = $index) {
      <button type="button" class="question-nav__dot" [class.question-nav__dot--answered]="question.answered"
              [disabled]="qi > maxReachedQuestionIndex()"
              [attr.aria-label]="'Ir a la pregunta ' + (qi + 1)"
              (click)="goToQuestion(qi)"></button>
    }
  </div>
  <button type="button" class="btn btn-link p-0 text-body" [disabled]="currentQuestionIndex() === 5"
          (click)="nextQuestion()" aria-label="Siguiente pregunta" title="Siguiente pregunta">
    <i class="bi bi-chevron-right fs-5"></i>
  </button>
</div>
```

```ts
// apps/frontend/src/app/features/questionnaire/questionnaire.component.ts (esquema, alcance local al bloque activo)
currentQuestionIndex = signal(0);
maxReachedQuestionIndex = signal(0); // se reinicia a 0 al cambiar de bloque (currentBlockIndex)

goToQuestion(index: number): void {
  if (index <= this.maxReachedQuestionIndex()) {
    this.currentQuestionIndex.set(index);
  }
}

nextQuestion(): void {
  const next = Math.min(this.currentQuestionIndex() + 1, 5);
  this.currentQuestionIndex.set(next);
  this.maxReachedQuestionIndex.set(Math.max(this.maxReachedQuestionIndex(), next));
}

previousQuestion(): void {
  this.currentQuestionIndex.set(Math.max(this.currentQuestionIndex() - 1, 0));
}
```

```scss
.question-nav__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: var(--bs-border-color);
  cursor: pointer;
}
.question-nav__dot--answered { background: $primary; }
.question-nav__dot:disabled { cursor: default; } // preguntas aún no alcanzadas: no clicables, sin look "deshabilitado" gris
```

Al llegar a la pregunta activa dentro del bloque, el contenido entra con esta transición — no un cambio
instantáneo ni una animación más larga/llamativa:

- Duración: `200ms`
- Easing: `ease-out`
- Efecto: fade + desplazamiento horizontal corto (`opacity 0→1`, `translateX(8px)→0`)
- Con `prefers-reduced-motion: reduce`, se elimina el desplazamiento y el fade se hace instantáneo (el
  cambio de pregunta sigue funcionando, solo sin la animación)

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

Como cada cambio de `currentQuestionIndex` renderiza (`@if`/`@switch`) un nodo nuevo para la pregunta
activa, basta con que `.question-pane` tenga esta animación declarada — no hace falta orquestarla
manualmente desde el componente TypeScript.

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

### Punto de pregunta al responder (`tab-icon-pop`, aplicado al `question-nav__dot`)

Mismo nombre de animación que en versiones anteriores (cuando esto vivía en el icono de una pestaña
`NgbNav`) — ahora se aplica al punto de `question-nav__dot` (ver sección "Navegación entre las 6
preguntas") al pasar de no respondida a respondida:

```scss
@keyframes tab-icon-pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.question-nav__dot--answered {
  animation: tab-icon-pop 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .question-nav__dot--answered { animation: none; }
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

## Píldoras seleccionables: cualidades (rediseño — sustituye a las cards con insignia)

**Rediseño confirmado sobre el mockup**: las 15 cualidades ya no son cards en grid con una insignia de
check superpuesta — son **píldoras/chips** (`rounded-pill`) en una fila que envuelve (`flex-wrap`). El
comportamiento no cambia, solo el estilo: dos reglas siguen siendo de comportamiento, no solo de estilo:

1. **Estado seleccionado = cambio de color, sin icono**: sin seleccionar, fondo gris claro y texto
   oscuro; seleccionada, fondo `$primary` (naranja) y texto blanco. A diferencia de la card anterior, no
   lleva una insignia de check superpuesta — el propio cambio de fondo ya comunica "elegida", así que no
   dupliques el estado con un icono adicional.
2. **Tope de 5 en la propia interacción**: al llegar a 5 cualidades marcadas, las píldoras **no**
   seleccionadas quedan `disabled` — no se puede marcar una sexta hasta desmarcar alguna de las 5.
   Desmarcar nunca se bloquea. Esto es distinto (y más estricto) del bloqueo de envío: aquí se impide la
   propia acción de marcar, no solo el botón de guardar.

Marcado exacto para el componente compartido `shared/quality-pill`, usado en registro paso 2 y en
configuración (ver `SKILL.md`, sección "Sistema de botones, iconos y formularios"). El output se llama
**`toggled`, no `toggle`** (implementado así en la sección 13 tras un fallo real de lint):
`@angular-eslint/no-output-native` rechaza cualquier nombre de output que coincida con un evento nativo
del DOM (`toggle` es el de `<details>`) — usa siempre `toggled` al copiar este bloque:

```html
<!-- apps/frontend/src/app/shared/quality-pill/quality-pill.component.html -->
<button
  type="button"
  class="btn quality-pill rounded-pill"
  [class.quality-pill--selected]="selected"
  [attr.aria-pressed]="selected"
  [disabled]="!selected && selectedCount >= 5"
  (click)="toggled.emit()">
  {{ label }}
</button>
```

`selectedCount` se pasa desde el contenedor (número de cualidades ya marcadas en todo el grupo, no un
estado propio de cada píldora individual):

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

```scss
// apps/frontend/src/app/shared/quality-pill/quality-pill.component.scss
.quality-pill {
  background: var(--bs-secondary-bg); // gris claro, no seleccionada
  color: $dark;
  border: none;
  padding: 0.4rem 1rem;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}

.quality-pill--selected {
  background: $primary;
  color: #FFFFFF;
}

.quality-pill:disabled {
  opacity: 0.5; // no seleccionada + tope de 5 alcanzado
  cursor: default;
}
```

## Pantalla de bienvenida del cuestionario (solo modo creación)

```html
<!-- apps/frontend/src/app/features/questionnaire/questionnaire-intro.component.html -->
@if (mode === 'create' && !started()) {
  <div class="auth-shell d-flex flex-column align-items-center justify-content-center text-center px-3 py-5">
    <svg class="brand-mark brand-mark--white mb-3" viewBox="0 0 345.3 336.08" width="48" height="48" aria-hidden="true">
      <!-- ver sección "Logo de marca" -->
    </svg>
    <h1 class="h4 text-white mb-2">Cuestionario de compatibilidad</h1>
    <p class="small text-white-75 mb-4" style="max-width:280px;">
      Responde con calma. Cuanto más concreta sea tu respuesta, mejor podrá comparate la IA.
    </p>
    <button type="button" class="btn btn-dark" (click)="started.set(true)">Iniciar</button>
  </div>
} @else {
  <!-- wizard de 6 bloques, ver "Cuestionario: wizard de 6 pasos" más abajo -->
}
```

En **modo edición** (`mode === 'edit'`), esta pantalla no se muestra nunca — `started()` empieza en
`true` directamente, así que se entra al wizard ya prerellenado sin pasar por aquí.

## Completar perfil: paginación de 2 puntos (registro paso 2)

```html
<!-- apps/frontend/src/app/features/registration/registration.component.html -->
@if (currentStep() === 0) {
  <form class="text-start">
    <div class="text-center mb-3">
      <button type="button" class="profile-photo-picker rounded-circle" (click)="pickPhoto()">
        @if (photoPreviewUrl()) {
          <img [src]="photoPreviewUrl()" class="rounded-circle" width="96" height="96" alt="">
        } @else {
          <span class="profile-photo-picker__placeholder"></span>
        }
      </button>
      <div class="small mt-2"><button type="button" class="btn btn-link p-0" (click)="pickPhoto()">Subir foto</button></div>
    </div>
    <div class="mb-3">
      <label class="form-label" for="name">Nombre completo <span class="text-danger" aria-hidden="true">*</span></label>
      <input id="name" class="form-control" formControlName="name" required>
    </div>
    <div class="mb-3">
      <label class="form-label" for="alias">Un alias único <span class="text-danger" aria-hidden="true">*</span></label>
      <input id="alias" class="form-control" formControlName="alias" required>
      <!-- El asterisco es aria-hidden (decorativo) — el atributo required nativo es lo que
           realmente anuncian los lectores de pantalla. Encontrado en verificación manual: sin
           ninguno de los dos, "Siguiente" se quedaba deshabilitado sin pista de por qué. -->
      <!-- feedback de disponibilidad de GET /users/check-alias, is-invalid/invalid-feedback si ocupado -->
    </div>
    <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-dark" [disabled]="step1Invalid()" (click)="goToStep(1)">Siguiente</button>
    </div>
  </form>
} @else {
  <div class="text-start">
    <h2 class="h5 text-center mb-3">Elige 5 cualidades que te describen</h2>
    <div class="d-flex flex-wrap gap-2 justify-content-center mb-4">
      @for (quality of qualities(); track quality.id) {
        <app-quality-pill [label]="quality.label" [selected]="quality.selected"
                           [selectedCount]="selectedCount()" (toggled)="onToggle(quality)" />
      }
    </div>
    <div class="d-flex justify-content-end">
      <button type="button" class="btn btn-dark" [disabled]="selectedCount() !== 5" (click)="submit()">Finalizar</button>
    </div>
  </div>
}

<div class="d-flex justify-content-center gap-2 mt-3">
  @for (step of [0, 1]; track step) {
    <span class="registration-dot" [class.registration-dot--active]="currentStep() === step" aria-hidden="true"></span>
  }
</div>
```

```scss
.profile-photo-picker {
  margin: 0 auto; // ver nota debajo — sin esto, queda descentrado pese al text-center del padre
  width: 96px;
  height: 96px;
  border: none;
  padding: 0;
  background: linear-gradient(135deg, #FB8500, #BE1E2D); // mismo degradado de marca que Shell B
}
// El propio boton necesita display:flex (no incluido en este extracto abreviado) para centrar el
// icono/imagen DE DENTRO — eso lo convierte en caja de bloque, así que el `text-center` del
// contenedor padre ya no lo centra a EL. margin: 0 auto lo centra igual, sin depender de eso.
// Encontrado en verificación manual con captura real, no solo en teoría — ver el fichero real
// (registration.component.scss) para el bloque completo con display/align-items/justify-content.
// Bug real independiente del anterior (2026-08-19, reportado con captura): sin object-fit, una foto
// que no sea ya perfectamente cuadrada (la inmensa mayoría) se renderiza a su propia proporción en
// vez de recortada al cuadrado del círculo — sale pequeña dentro de él, no solo descentrada.
.profile-photo-picker img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.profile-photo-picker__placeholder {
  display: block;
  width: 100%;
  height: 100%;
}

.registration-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--bs-border-color);
}
.registration-dot--active { background: $dark; }
```

Los 2 puntos son solo indicador de posición, no clicables (a diferencia de los segmentos de la barra del
cuestionario) — con solo 2 pasos y validación secuencial (el paso 2 exige que el paso 1 sea válido) no
hace falta saltar por delante.

## Pantalla de procesamiento

```html
<!-- apps/frontend/src/app/features/processing/processing.component.html -->
<h1 class="h3 mb-1">Analizando tu compatibilidad</h1>
<p class="text-body-secondary mb-4">Esto puede tardar unos segundos por candidato.</p>

<div class="card">
  <div class="card-body">
    <div class="d-flex justify-content-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Analizando…</span>
      </div>
    </div>
    <ul class="list-group list-group-flush">
      @for (comparison of comparisons(); track comparison.id) {
        <li class="list-group-item d-flex align-items-center gap-3">
          <img [src]="comparison.candidate.photoUrl" class="rounded-circle" width="32" height="32" alt="">
          <span class="flex-grow-1">{{ comparison.candidate.alias }}</span>
          @switch (comparison.status) {
            @case ('completed') { <i class="bi bi-check-circle-fill text-primary"></i> }
            @case ('error') { <i class="bi bi-exclamation-triangle text-danger"></i> }
            @default { <span class="spinner-border spinner-border-sm text-body-secondary" role="status"></span> }
          }
        </li>
      }
    </ul>
  </div>
</div>
```

Nunca un porcentaje agregado ni "1 de 3": cada comparación termina en un momento distinto e
impredecible, así que el refuerzo aquí es "qué candidatos ya están listos" (lista con icono de estado),
no "cuánto queda". El polling (`GET /users/me/comparisons`) se detiene y navega al dashboard en cuanto
todas están en `completed`/`error`.

## Cierre explícito sobre la pantalla principal: `shared/modal-panel` (Configuración y Chats)

Feedback explícito de la usuaria (2026-08-19): `features/settings`, `features/chats` y
`features/chats/:id` deberían llevar un cierre explícito ("×") hacia la pantalla principal, en vez de
depender solo del botón atrás del navegador o de la cabecera. Ver `SKILL.md`, "Configuración y Chats:
cierre explícito ('×') sobre la pantalla principal", para el porqué completo (incluye por qué se
descartó `NgbModal`, y por qué una primera versión con backdrop + card centrada se simplificó a esto).
Aquí el marcado exacto del envoltorio compartido:

```ts
// apps/frontend/src/app/shared/modal-panel/modal-panel.component.ts
@Component({
  selector: 'app-modal-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './modal-panel.component.html',
  styleUrl: './modal-panel.component.scss',
})
export class ModalPanelComponent {
  readonly title = input<string | null>(null);
}
```

```html
<!-- apps/frontend/src/app/shared/modal-panel/modal-panel.component.html -->
<div class="card">
  @if (title()) {
    <div class="card-header d-flex align-items-center justify-content-between">
      <span class="fw-semibold">{{ title() }}</span>
      <button type="button" class="btn btn-link p-0 text-body" routerLink="/" aria-label="Cerrar">
        <i class="bi bi-x-lg" aria-hidden="true"></i>
      </button>
    </div>
  }
  <ng-content></ng-content>
</div>
```

Sin CSS propio: es una `.card` normal de Bootstrap, ocupando todo el ancho de `<main>` como cualquier
otra pantalla de Shell A (ver "El patrón container + card" más abajo) — nada de backdrop, ancho
máximo ni centrado propio.

**`title` opcional**: con él (Configuración, Chats), el panel añade su propia franja `card-header` con
el título y el cierre. Sin él (conversación de chat, que ya tiene su propia cabecera contextual — ver
más abajo), el panel no añade nada propio: el contenido proyectado lleva su propio `card-header` Y su
propio botón de cerrar (mismo marcado del botón, duplicado a propósito en ese único caso en vez de
complicar el componente compartido).

## Configuración: sección de perfil (recalcular ahora) y sección de cuestionario

**3 cards independientes** (no 3 secciones dentro del mismo `card-body` — ver `page-template.md`,
"Casos especiales", para el porqué), envueltas en `<app-modal-panel title="Configuración">` (ver
sección anterior), en este orden: **Perfil → Cuestionario → Contraseña** (feedback explícito de la
usuaria, 2026-08-19: cuestionario antes que contraseña, no al final).

**Card Perfil** — tras guardar, si la selección de cualidades cambió (`needs_recalculation` pasa a
`true`), ofrece recalcular sin tener que ir antes al dashboard:

```html
<!-- apps/frontend/src/app/features/settings/settings.component.html -->
<app-modal-panel title="Configuración">
  <div class="card mb-4">
    <div class="card-header">Tu perfil</div>
    <div class="card-body">
      <!-- email de la sesión activa (readonly, no editable — pedido explícito de la usuaria,
           2026-08-20): -->
      <div class="mb-3">
        <label class="form-label" for="settings-email">Email</label>
        <input id="settings-email" type="email" class="form-control-plaintext" [value]="userEmail()" readonly />
      </div>
      <!-- nombre, alias, quality-pill... -->
      @if (showRecalculateBanner()) {
        <div class="alert alert-warning d-flex align-items-center justify-content-between gap-2 mt-3" role="alert">
          <span>Tu compatibilidad necesita recalcularse con tus nuevas cualidades.</span>
          <button type="button" class="btn btn-dark btn-sm text-nowrap" (click)="recalculateNow()">
            Recalcular compatibilidad ahora
          </button>
        </div>
      }
    </div>
    <div class="card-footer bg-white d-flex justify-content-end">
      <button type="button" class="btn btn-dark" (click)="saveProfile()">Guardar cambios</button>
    </div>
  </div>

  <!-- card "Tu cuestionario" aquí (ver más abajo) -->
  <!-- card "Cambiar contraseña" al final -->
</app-modal-panel>
```

**Card Cuestionario** — resumen + botón que **navega** (no despliega inline) al cuestionario en modo
edición, donde el propio guardado del último bloque ya recalcula (ver decisión 3h de `design.md` y la
sección "Pantalla de bienvenida del cuestionario" más arriba):

```html
<div class="card mb-4">
  <div class="card-header">Tu cuestionario</div>
  <div class="card-body d-flex align-items-center justify-content-between flex-wrap gap-2">
    <span>Completado el {{ questionnaireCompletedAt() | date: 'longDate' }}</span>
    <button type="button" class="btn btn-outline-dark" routerLink="/questionnaire" [queryParams]="{ mode: 'edit' }">
      Editar tus respuestas
    </button>
  </div>
</div>
```

```ts
// apps/frontend/src/app/features/settings/settings.component.ts (esquema)
async recalculateNow(): Promise<void> {
  await this.matchingService.recalculate(); // POST /users/me/recalculate
  this.router.navigate(['/dashboard']);
}
```

Ninguno de los dos atajos duplica lógica de recálculo propia entre sí: ambos llaman directamente al
mismo `POST /users/me/recalculate` — o, en el caso del cuestionario, quedan encadenados dentro del
propio botón "Guardar y recalcular compatibilidad" del último bloque en modo edición (ver
`footerButtonLabel()`/`submitLastBlock()` más arriba). **El dashboard ya no tiene un botón de
recalcular propio** (retirado a petición explícita de la usuaria, 2026-08-19 — decisión original 5b de
`design.md`, ver el change de OpenSpec `simplify-dashboard-recalculate`): resultaba redundante con
estos dos atajos, siempre visible pero casi siempre deshabilitado. `recalculateNow()` de este
componente llama a `POST /users/me/recalculate` por su cuenta y navega al dashboard ya con el
recálculo en marcha, sin depender de que exista ningún botón allí.

El botón "Editar tus respuestas" es `btn-outline-dark` (acción secundaria de la sección, no la principal
de la pantalla — esa sigue siendo "Guardar cambios" del perfil).

## Chat interno: botón de la card, listado y burbujas de mensaje

Valores exactos para la sección "Chat interno" de `SKILL.md` (capability `internal-chat`, ver `design.md`
decisión 9).

### Botón "Chatear" en la card del dashboard

```html
<!-- dentro del card-footer de cada card de features/results-dashboard -->
<button type="button" class="btn btn-dark btn-sm" (click)="startChat(comparison.candidateUserId)">
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

Envuelto en `<app-modal-panel title="Chats">` (ver más arriba) — el `list-group-flush` va directo,
**sin** una `card`+`card-body.p-0` propia de por medio: quedaría redundante anidada dentro de la card
del propio panel (Bootstrap ya prevé `list-group-flush` como hijo directo de una `.card`):

```html
<!-- apps/frontend/src/app/features/chats/chats.component.html -->
<app-modal-panel title="Chats">
  <div class="list-group list-group-flush">
    @for (conversation of conversations(); track conversation.id) {
      <button type="button" class="list-group-item list-group-item-action d-flex align-items-center gap-3"
              (click)="openConversation(conversation.id)">
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
</app-modal-panel>
```

Sin `card-footer`: el listado no tiene una acción "principal" propia, cada fila navega a su conversación.

### Conversación (`features/chats/:id`) — burbujas de mensaje

Envuelto en `<app-modal-panel>` **sin** `title` (ya tiene su propia cabecera contextual): el cierre del
modal (a "/", pantalla principal) se añade directamente en esa cabecera, junto al nombre —
`justify-content-between` entre el grupo "volver + foto + alias" y el botón de cerrar, distinto de la
flecha de volver (que solo retrocede un paso, a `/chats`):

```html
<!-- apps/frontend/src/app/features/chats/chat-conversation.component.html -->
<app-modal-panel>
  <div class="card-header d-flex align-items-center justify-content-between gap-2">
    <div class="d-flex align-items-center gap-2 overflow-hidden">
      <button type="button" class="btn btn-link p-0 text-body" routerLink="/chats" aria-label="Volver a chats">
        <i class="bi bi-arrow-left fs-4"></i>
      </button>
      <img [src]="conversation().otherParticipant.photoUrl" class="rounded-circle flex-shrink-0" width="32" height="32" alt="">
      <span class="fw-semibold text-truncate">{{ conversation().otherParticipant.alias }}</span>
    </div>
    <button type="button" class="btn btn-link p-0 text-body flex-shrink-0" routerLink="/" aria-label="Cerrar">
      <i class="bi bi-x-lg" aria-hidden="true"></i>
    </button>
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
    <button type="button" class="btn btn-dark" (click)="send()" [disabled]="!draftMessage.trim()">
      <i class="bi bi-send"></i>
    </button>
  </div>
</app-modal-panel>
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
