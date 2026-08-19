# Design: Enlace del logo/"AfinIA" de la cabecera a la pantalla principal

## Decisión 1: Reutilizar `mainRouteGuard` vía `routerLink="/"`, no calcular el destino en `ShellComponent`

El enlace del logo/"AfinIA" navega literalmente a `/` (`routerLink="/"` sobre el `<a class="navbar-brand">`)
y deja que `mainRouteGuard` (ya existente, `core/guards/main-route.guard.ts`) resuelva el destino real
según el estado del usuario — mismo patrón que ya usa `questionnaire.component.ts` (`previousBlock()`,
flecha de la cabecera del cuestionario en el bloque 1: "Navega a '/' y deja que `mainRouteGuard` decida
el destino").

**Alternativas consideradas:**

- **Calcular el destino dentro de `ShellComponent`** (inyectar `UsersService`, leer
  `questionnaireCompletedAt` y navegar directamente a `/questionnaire` o `/dashboard`). Rechazado:
  duplicaría exactamente la lógica de prioridad que `mainRouteGuard` ya posee (perfil → cuestionario →
  dashboard), con el riesgo real de que ambos lugares diverjan si esa prioridad cambia algún día en
  uno de los dos sitios y no en el otro. `mainRouteGuard` es la única fuente de verdad de esa
  resolución (spec `results-dashboard`, "Enrutamiento de la página principal").
- **Añadir un ítem de navegación fijo "Dashboard"** junto a Chats/Configuración, apuntando siempre a
  `/dashboard`. Rechazado explícitamente: el comportamiento pedido es justo el contrario — el destino
  depende de si el usuario ya completó el cuestionario o no; un enlace fijo a `/dashboard` sería
  incorrecto (o llevaría a un 403/redirección inesperada) mientras el cuestionario siga sin completar.
- **Usar un `<button (click)="goHome()">`** en vez de un `<a routerLink>`, igual que "Chats"/
  "Configuración" (que sí son `<button>`). Rechazado para este caso concreto: un logo/marca es
  semánticamente un enlace de navegación, no una acción — `<a routerLink>` genera un `href` real (clic
  central/`Ctrl`+clic para abrir en pestaña nueva, hover con cursor de enlace, lector de pantalla lo
  anuncia como enlace), nada de lo cual necesitan realmente "Chats"/"Configuración" al ser acciones de
  la propia SPA. No se toca el patrón `<button routerLink>` ya existente de esos dos — es un estilo ya
  asentado en el resto de la cabecera y no es el objeto de este cambio.

## Decisión 2: Sin nueva capability — extiende `results-dashboard`

"Enrutamiento de la página principal según el estado del usuario" ya vive en la spec `results-dashboard`
(la resolución cuestionario/dashboard es, en esencia, "qué pantalla es la principal ahora mismo", que es
el propósito central de esa capability). Este cambio no introduce un concepto nuevo, solo un segundo
punto de entrada (la cabecera, alcanzable desde cualquier pantalla autenticada) al mismo resultado que
ya se documenta al abrir la aplicación — se modela como un nuevo escenario de la misma Requirement, no
como una Requirement ni una capability nueva.
