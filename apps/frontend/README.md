# AfinIA — Frontend

Interfaz [Angular](https://angular.dev/) del proyecto AfinIA (TFM). Ver el
[README de la raíz](../../README.md) para el contexto general del monorepo.

**Antes de tocar cualquier pantalla**, consulta
[`.claude/skills/ui-design-consistency/`](../../.claude/skills/ui-design-consistency/SKILL.md) —
define el shell de página, el patrón container+card, el sistema de botones/formularios/estados, y
los tokens exactos de color/tipografía de la marca AfinIA.

## Scripts

```bash
npm start          # dev server (http://localhost:4200), recarga en caliente
npm run build       # build de producción → dist/frontend/browser/
npm run lint         # ESLint (angular-eslint)
npm test             # tests unitarios con Karma/Jasmine (no Vitest — fijado explícitamente en
                      # angular.json, ver design.md tarea 1.3) en Chrome headless
```

## Notas de esta app

- **Bootstrap 5 + Bootstrap Icons + ng-bootstrap**, compilados desde su fuente Sass en
  `src/styles.scss` con la paleta de marca AfinIA sobrescrita antes del `@import` — nunca el CSS
  precompilado de Bootstrap sin tokenizar.
- El build de producción coloca los estáticos en `dist/frontend/browser/` (no `dist/frontend/`
  directamente) — importante al configurar el *Output Directory* en Vercel.
- `@supabase/supabase-js` es el único cliente de autenticación — el frontend llama directo a
  Supabase Auth (signUp/signIn/signOut/reset de contraseña); el backend solo valida el JWT.
