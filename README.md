# AfinIA — Compatibility Check (TFM)

App web que mide la compatibilidad entre dos personas mediante un cuestionario de 36 preguntas
analizado por IA (Groq, con OpenRouter como alternativa), comparando a cada usuario contra los 3
candidatos más afines de un pool preseleccionado por cualidades personales compartidas. Proyecto de
Trabajo de Fin de Máster.

## Stack

- **Backend**: [NestJS](https://nestjs.com/) 11 + `@nestjs/cqrs` (Commands/Events selectivos) +
  `nestjs-pino` (logging estructurado, con transport opcional a Better Stack/Logtail).
- **Frontend**: [Angular](https://angular.dev/) 22 + Bootstrap 5 / Bootstrap Icons / ng-bootstrap
  (recompilado desde Sass con la paleta de marca AfinIA) + `@supabase/supabase-js`.
- **Datos/Auth/Storage**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage).
- **Tipos compartidos**: `packages/shared-types` (contrato único frontend/backend, validado con Zod).
- **CI**: GitHub Actions (lint + tests unitarios + tests e2e + build, y tests de integración contra
  el stack local de Supabase). Despliegue vía integración nativa de Vercel (frontend) y Render
  (backend) — sin Terraform ni workflow de deploy propio.

## Estructura del monorepo

```
apps/
  backend/    # NestJS — API, orquestación de IA, acceso a datos
  frontend/   # Angular — toda la interfaz de usuario
packages/
  shared-types/  # Interfaces + esquemas Zod compartidos entre backend y frontend
supabase/
  migrations/    # Esquema SQL + políticas RLS
  templates/     # Plantillas de email de Supabase Auth con marca AfinIA
  seed/          # Datos sintéticos de prueba
openspec/
  changes/build-compatibility-mvp/  # Fuente de verdad: proposal.md, design.md, specs/, tasks.md
docs/
  plan.md          # Narrativa completa de contexto y decisiones (complementa design.md)
  architecture.md  # Configuración resultante de infraestructura (Auth, Storage, CI/CD)
  brand/           # Assets de marca (logo, favicons)
```

## Empezar a desarrollar

Requiere Node.js 24+ y npm. Los tests de integración además requieren
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (usan el stack local de Supabase).

```bash
npm install                          # instala todos los workspaces y compila packages/shared-types
                                      # automáticamente (postinstall), para que backend/frontend
                                      # puedan importarlo ya compilado
npm run lint                         # ESLint (backend + frontend)
npm test                             # tests unitarios (Jest + Karma/Jasmine), sin Docker
npm run test:e2e                     # tests e2e del backend (AppModule en memoria, sin Docker)
npm run build                        # build de producción de ambas apps
```

```bash
npm run start:dev --workspace=apps/backend    # backend en watch mode (http://localhost:3000)
npm run start --workspace=apps/frontend       # frontend en dev server (http://localhost:4200)
```

Desde la sección 11 (`core/shell`, guards de ruta), el frontend ya llama de verdad a Supabase Auth y
al backend (antes era un scaffold vacío que no necesitaba ninguno de los dos arrancado). Para
recorrer la app más allá de la landing pública hace falta, además, `npx supabase start` (mismo stack
local que usan los tests de integración) y el backend en marcha — `apps/frontend/src/environments/
environment.ts` ya apunta a sus URLs por defecto (`http://127.0.0.1:54321` / `http://localhost:3000`),
sin configuración adicional.

### Tests de integración

Ejercitan RLS y el esquema real de Postgres contra el stack local de Supabase (nunca el proyecto
real) — ver `design.md`, decisión 11.

```bash
npx supabase start
set -a
eval "$(npx supabase status -o env \
  --override-name api.url=SUPABASE_URL \
  --override-name auth.anon_key=SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name db.url=SUPABASE_DB_URL)"
set +a
npm run test:integration
npx supabase stop
```

### Semilla de datos sintéticos

`supabase/seed/seed.ts` puebla el catálogo de 15 cualidades, 10 usuarios sintéticos completos
(`supabase/seed/seed-users.json`, congelado — sin llamadas al proveedor de IA) y una cuenta de
demostración sin perfil (sección 18 de `tasks.md`). Idempotente: se puede ejecutar varias veces sin
duplicar ni recrear nada.

```bash
npx supabase start
set -a
eval "$(npx supabase status -o env \
  --override-name api.url=SUPABASE_URL \
  --override-name auth.anon_key=SUPABASE_ANON_KEY \
  --override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
  --override-name db.url=SUPABASE_DB_URL)"
set +a
npm run seed
```

Contra el proyecto real (tras la tarea 19.1), exporta en su lugar `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` de ese proyecto antes de `npm run seed`. La cuenta de demostración
(`demo@seed.compatibility-check.local`) se crea con una contraseña aleatoria no comunicada; para
usarla en una presentación en vivo, resetea su contraseña a mano desde el Dashboard de Supabase
(nunca se documenta en ningún fichero versionado, ver tarea 18.5).

## Documentación y flujo de trabajo

Este proyecto sigue [OpenSpec](https://github.com/Fission-AI/OpenSpec): el detalle formal de
requisitos, diseño y tareas vive en `openspec/changes/build-compatibility-mvp/`
(`proposal.md`/`design.md`/`specs/`/`tasks.md`), que es la fuente de verdad si algo difiere de
`docs/plan.md`. El progreso de implementación se marca con `[x]` directamente en `tasks.md`.

Antes de tocar cualquier pantalla de `apps/frontend`, consultar
`.claude/skills/ui-design-consistency/` (estructura de página, sistema de botones/formularios,
tokens de color/tipografía exactos).
