# Tasks: Retirar el botón de recalcular del dashboard y arreglar el sondeo tras recalcular

## 1. Bug real: el dashboard no se actualiza solo tras recalcular (TDD)

- [x] 1.1 Confirmado en vivo en producción: tras recalcular desde Configuración, las tarjetas se
      quedan con el spinner hasta un F5 manual
- [x] 1.2 `DASHBOARD_POLL_INTERVAL_MS` (`InjectionToken` con `factory`, mismo patrón que
      `core/supabase-client.ts`) — el valor de producción (3000ms) vive en la propia `factory`, los
      tests lo sobrescriben con un valor mínimo para no depender de esperas reales largas
      (`fakeAsync`/`tick` no disponible: este proyecto no carga `zone.js/testing`, confirmado al
      intentarlo)
- [x] 1.3 Sondeo periódico en `ResultsDashboardComponent` (mismo patrón que `features/processing`):
      corre siempre, pero solo repite `GET /users/me/comparisons` mientras
      `hasPendingComparisons()` sea cierto
- [x] 1.4 Tests nuevos (rojo confirmado desactivando el sondeo antes de aplicar el fix): vuelve a
      pedir mientras haya `pending`/`analyzing`, deja de pedir en cuanto todo termina, no pide de más
      si ya estaba todo completado desde el principio

## 2. Retirar el botón de recalcular del dashboard

- [x] 2.1 `results-dashboard.component.html`: retirado el botón y simplificada la cabecera (título +
      subtítulo + badge de progreso, sin el `d-flex justify-content-between` que lo acomodaba)
- [x] 2.2 `results-dashboard.component.ts`: retirados `needsRecalculation`, `recalculating`,
      `recalculateNow()` y las inyecciones de `MatchingService`/`UsersService` (ya no se usan aquí)
- [x] 2.3 `results-dashboard.component.spec.ts`: retirados los tests del botón (`tarea 16.4`) y
      simplificado `setup()` (sin `getOwnProfileSpy`/`recalculateSpy`/`needsRecalculation`)
- [x] 2.4 Suite completa frontend y lint en verde

## 3. Documentación

- [x] 3.1 `specs/results-dashboard` (delta MODIFIED + REMOVED): requisito del botón retirado,
      requisito de visualización ampliado con el nuevo escenario de auto-actualización
- [x] 3.2 `SKILL.md`/`design-tokens.md`: corregidas las menciones al botón del dashboard (decisión 5b)
      que ya no existen; los dos atajos de Configuración quedan documentados como autosuficientes
