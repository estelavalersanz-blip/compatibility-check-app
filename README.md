# AfinIA — Compatibility Check (TFM)

App web que mide la compatibilidad entre dos personas mediante un cuestionario de 36 preguntas
analizado por IA (Groq, con OpenRouter como alternativa), comparando a cada usuario contra los 3
candidatos más afines de un pool preseleccionado por cualidades personales compartidas. Proyecto de
Trabajo de Fin de Máster.

## Stack

- **Backend**: [NestJS](https://nestjs.com/) 11 + `@nestjs/cqrs` (Commands/Events selectivos) +
  `nestjs-pino` (logging estructurado a stdout; sin persistencia externa, ver `design.md` decisión 8b).
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
  specs/           # Fuente de verdad vigente: un spec.md por capability (10, ver más abajo)
  changes/archive/2026-08-18-build-compatibility-mvp/  # Cambio original ya archivado (166/166
                   # tareas) — proposal.md/design.md/tasks.md como registro histórico de decisiones
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

## Limitaciones de las herramientas gratuitas (importante antes de una demo en vivo)

Todo el stack corre en planes gratuitos (design.md, decisión 10) — esto es lo que hay que tener en
cuenta de cara a una presentación en vivo, con lo ya confirmado real durante la tarea 20.2 (verificación
end-to-end) marcado explícitamente:

- **Groq — límite de peticiones (confirmado real)**: completar más de un cuestionario nuevo seguido
  en pocos minutos (o reintentar varias comparaciones a la vez) agota el límite del free tier y Groq
  responde `429`; el reintento automático interno (backoff de 50/150ms, pensado para no ralentizar
  los tests) no espera lo suficiente para recuperarse solo. Antes de la presentación, evita disparar
  varios análisis reales seguidos; si una comparación queda en `error` por esto, espera ~1 minuto y
  usa el botón de reintentar (`POST /comparisons/:id/reanalyze`) en vez de repetir el cuestionario
  entero.
- **Groq — catálogo de modelos (confirmado real)**: Groq retira modelos con cierta frecuencia — el
  modelo original de este proyecto (`llama-3.3-70b-versatile`) dejó de existir y todas las llamadas
  devolvían `404` hasta sustituirlo por `openai/gpt-oss-120b`
  (`apps/backend/src/ai/groq.provider.ts`). Si el análisis empieza a fallar con `404` en vez de
  `429`, comprueba el catálogo vigente con `GET https://api.groq.com/openai/v1/models` (cabecera
  `Authorization: Bearer <GROQ_API_KEY>`) y actualiza `GROQ_MODEL` ahí.
- **Supabase Auth — límite de envío de emails (confirmado real, resuelto)**: el SMTP incluido en el
  free tier tiene un límite bajo de emails transaccionales (registro, recuperación de contraseña) —
  se agotó de verdad durante la tarea 20.2 tras varias altas/reintentos seguidos
  (`over_email_send_rate_limit`, `429`), bloqueando tanto nuevos registros como el reset de
  contraseña por email. Ese mismo SMTP por defecto además solo entrega a direcciones del equipo del
  proyecto en Supabase — bloqueaba el registro a cualquier usuario real, no solo cuando se agotaba
  el límite. **Resuelto configurando un SMTP propio de Gmail** en el Dashboard (Authentication →
  Emails → SMTP Settings; cuenta ad hoc dedicada a esto, no una personal), con plantillas propias con
  marca AfinIA (ver `supabase/templates/`): sube el límite a 30/hora y quita la restricción de
  destinatario. Sigue habiendo un respaldo si hiciera falta operar sin esperar a que se libere ese
  límite: fijar una contraseña directamente por la Admin API sin pasar por email
  (`PUT /auth/v1/admin/users/:id`, con `curl.exe` — no `Invoke-RestMethod` de PowerShell, que
  Supabase bloquea como "uso de la Secret key desde un navegador" por su `User-Agent` por defecto).
  Antes de la demo, evita registrar cuentas de prueba de más en el proyecto real.
- **Render — cold-start (documentado, no forzado a propósito durante la verificación)**: la primera
  petición tras ~15 min de inactividad tarda 30-60s en responder (free tier) — la pantalla de
  "procesando" ya lo tiene en cuenta, pero conviene "despertar" el backend con una petición de
  prueba unos minutos antes de empezar la presentación.
- **Vercel (sin incidencias, límites estándar del plan Hobby)**: ancho de banda y minutos de build
  mensuales limitados — sin problema para el volumen de una demo de TFM, no se ha necesitado ajustar
  nada.

## Documentación y flujo de trabajo

Este proyecto sigue [OpenSpec](https://github.com/Fission-AI/OpenSpec). El cambio original
(`build-compatibility-mvp`) llegó a 166/166 tareas y ya está archivado en
`openspec/changes/archive/2026-08-18-build-compatibility-mvp/` — sus `proposal.md`/`design.md`/
`tasks.md` quedan ahí como registro histórico de decisiones (útil para la memoria del TFM), pero ya
no son la fuente de requisitos vigente. Esa fuente de verdad ahora es `openspec/specs/` (un
`spec.md` por capability — `authentication`, `candidate-matching`, `internal-chat`,
`personal-questionnaire`, `responsive-ui`, `results-dashboard`, `seed-data`, `user-registration`,
`user-settings`, `ai-compatibility-analysis`), sincronizada desde las delta specs del cambio al
archivarlo; consultar ahí si algo difiere de `docs/plan.md`.

Antes de tocar cualquier pantalla de `apps/frontend`, consultar
`.claude/skills/ui-design-consistency/` (estructura de página, sistema de botones/formularios,
tokens de color/tipografía exactos).
