# Retirar el botón de recalcular del dashboard y arreglar el sondeo tras recalcular

## Why

Feedback explícito de la usuaria (2026-08-19): el botón "Recalcular compatibilidad" del dashboard
(decisión 5b de `design.md`) está casi siempre deshabilitado — solo se activa cuando el perfil queda
marcado como pendiente de recalcular, algo que ya tiene dos puntos de entrada propios en
`features/settings` (el banner "Recalcular compatibilidad ahora" tras guardar cualidades distintas, y
"Guardar y recalcular compatibilidad" al editar el cuestionario). Tenerlo TAMBIÉN, y de forma
redundante, en el dashboard no aporta nada — es una acción casi siempre inerte ocupando espacio en la
pantalla principal.

Al investigar el botón del dashboard para retirarlo, verificado en vivo en producción un segundo bug
real, independiente del anterior: tras recalcular (desde cualquiera de los dos atajos de Configuración,
que navegan al dashboard al terminar), las tarjetas se quedaban con el spinner de "Analizando…" para
siempre — hacía falta un F5 manual para ver los resultados ya calculados de verdad por el backend. Causa:
`ResultsDashboardComponent` solo pedía `GET /users/me/comparisons` una vez, en la carga inicial —
mientras el análisis asíncrono de IA seguía en curso (varios segundos, con reintentos), nada volvía a
refrescar la vista. Esto no depende de qué botón disparó el recálculo, así que sigue haciendo falta
arreglarlo aunque el botón del dashboard desaparezca — el mismo problema ocurriría llegando desde
Configuración.

## What Changes

- **REMOVED** de `results-dashboard`: la Requirement "Botón de recalcular compatibilidad en el
  dashboard" — esa acción vive ahora exclusivamente en `user-settings` (sin cambios ahí: ya estaba
  documentada, ver "Cambiar la selección de cualidades marca el perfil como pendiente de recalcular" y
  "Acceso a la edición del cuestionario... con recálculo integrado"). El requisito de backend
  (`candidate-matching`, "Recálculo manual de las propias comparaciones") no cambia: sigue rigiendo el
  comportamiento del endpoint `POST /users/me/recalculate` en sí, independiente de qué pantalla lo
  invoque.
- **MODIFIED** `results-dashboard`: la Requirement "Visualización de las comparaciones de un usuario"
  añade que el sistema SHALL mantener esa vista actualizada por sí sola mientras el análisis siga en
  curso, sin exigir un recargo manual de la página.
- `results-dashboard.component.ts`: sondeo periódico de `GET /users/me/comparisons` mientras alguna
  comparación siga en `pending`/`analyzing` (mismo patrón que `features/processing`, 3s) — se detiene
  solo cuando ya no queda ninguna pendiente, sin necesitar suscribir/desuscribir dinámicamente.
- `results-dashboard.component.html`: se retira el botón y su lógica asociada (`needsRecalculation`,
  `recalculating`, `recalculateNow()`); la cabecera queda solo con el título, subtítulo y el badge de
  progreso.

## Impact

- Affected specs: `results-dashboard` (MODIFIED + REMOVED)
- Affected code: `apps/frontend/src/app/features/results-dashboard/results-dashboard.component.ts`,
  `.html`, `.spec.ts`
- Sin cambios de API pública ni de base de datos — `POST /users/me/recalculate` y
  `GET /users/me/comparisons` no cambian de forma, solo qué pantalla(s) los usan y con qué frecuencia
  se sondea el segundo
- `MatchingService`/`UsersService` dejan de inyectarse en `ResultsDashboardComponent` (ya no se
  necesitan ahí)
