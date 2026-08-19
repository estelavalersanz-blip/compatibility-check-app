# Enlace del logo/"AfinIA" de la cabecera a la pantalla principal

## Why

La cabecera compartida de la aplicación autenticada (Shell A, `core/shell`) muestra el logo y el texto
"AfinIA" como un `<span>` puramente decorativo — no navega a ningún sitio. Verificado en producción
(sección de verificación del fix de `questionnaireCompletedGuard`, 2026-08-19): una vez en
Configuración o en Chats, no existe ninguna manera dedicada de volver a la pantalla principal. Las
únicas vías son el botón "Atrás" del navegador, escribir la URL a mano, cerrar sesión y volver a
entrar, o (solo desde Configuración) guardar una edición del cuestionario, que navega al dashboard
como efecto colateral de esa acción concreta, no como un "volver".

Decisión ya tomada previamente sobre el comportamiento esperado (retomada aquí porque nunca llegó a
implementarse ni a documentarse formalmente): el logo y el texto "AfinIA" de la cabecera deben navegar
a la pantalla principal de la aplicación, la cual ya se resuelve según el estado del usuario
(cuestionario si no lo ha completado nunca, dashboard si ya lo completó) — exactamente el mismo
criterio que `mainRouteGuard` aplica en la ruta `/` y que la spec `results-dashboard` ya documenta
como "Enrutamiento de la página principal".

## What Changes

- El logo + "AfinIA" de `core/shell/shell.component.html` pasan de `<span>` inerte a un enlace real
  (`<a routerLink="/">`) — reutiliza la resolución ya existente de `mainRouteGuard`, sin introducir
  ninguna lógica de enrutamiento nueva ni duplicar el criterio de prioridad (perfil → cuestionario →
  dashboard) en `ShellComponent`.
- Estado visual de hover/focus en el enlace, coherente con el resto de la cabecera (`.btn-link` ya
  tiene el mismo tratamiento).
- **MODIFIED** `results-dashboard`: la Requirement "Enrutamiento de la página principal según el
  estado del usuario" gana un nuevo escenario documentando este punto de entrada permanente desde la
  cabecera compartida.
- Sin cambios de backend, sin nuevas rutas, sin nueva capability — es una extensión de un
  comportamiento de enrutamiento ya existente y ya especificado.

## Impact

- Affected specs: `results-dashboard` (MODIFIED)
- Affected code: `apps/frontend/src/app/core/shell/shell.component.html`,
  `apps/frontend/src/app/core/shell/shell.component.scss`,
  `apps/frontend/src/app/core/shell/shell.component.spec.ts`
- Affected docs: `.claude/skills/ui-design-consistency/SKILL.md`,
  `.claude/skills/ui-design-consistency/references/design-tokens.md`,
  `.claude/skills/ui-design-consistency/references/page-template.md`
