# Tasks: Enlace del logo/"AfinIA" de la cabecera a la pantalla principal

## 1. Implementación (TDD)

- [x] 1.1 Test primero en `shell.component.spec.ts`: clic en el logo/"AfinIA" navega a `/` (confirmado
      en rojo antes de tocar la plantilla: quedaba en `/shell`)
- [x] 1.2 `shell.component.html`: `<span class="navbar-brand">` → `<a class="navbar-brand"
      routerLink="/" aria-label="Ir a la pantalla principal">`
- [x] 1.3 `shell.component.scss`: hover/focus (`opacity: 0.85`) coherente con `.btn-link` de la misma
      cabecera
- [x] 1.4 Test en verde; suite completa del frontend (157/157) y lint sin avisos

## 2. Documentación

- [x] 2.1 `proposal.md` + `design.md` (2 decisiones: reutilizar `mainRouteGuard` vs. calcular destino
      propio / enlace fijo a dashboard; sin capability nueva)
- [x] 2.2 `specs/results-dashboard/spec.md` (delta): nuevo escenario "Acceso a la pantalla principal
      desde el logo/marca de la cabecera" en la Requirement ya existente de enrutamiento
- [x] 2.3 `.claude/skills/ui-design-consistency/SKILL.md` (Shell A): documentar el logo como enlace a
      "/", no solo decorativo
- [x] 2.4 `.claude/skills/ui-design-consistency/references/design-tokens.md` (Shell A): snippet HTML
      actualizado con `<a routerLink="/">`
- [x] 2.5 `.claude/skills/ui-design-consistency/references/page-template.md`: comprobado — no
      reproduce el `navbar-brand` (su plantilla de "pantalla autenticada" empieza en el `<h1>` de la
      feature, no en la cabecera de Shell A), no necesita cambios
