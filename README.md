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

## Despliegue

La aplicación está desplegada y en funcionamiento (plan gratuito en ambos servicios):

- **Frontend**: <https://compatibility-check-app.vercel.app>
- **Backend (API)**: <https://compatibility-check-app.onrender.com>

Detalle completo de la configuración de cada servicio en [`docs/architecture.md`](docs/architecture.md).
El backend está en el plan gratuito de Render: la primera petición tras ~15 min de inactividad puede
tardar 30-60s en responder (cold-start) — ver "Limitaciones de las herramientas gratuitas" más abajo.

## Slides y vídeo (TFM)

- **Slides**: <https://claude.ai/code/artifact/812252b8-3d7d-40ee-9ae5-ac9004c349f9> — también disponibles
  como documento en [`docs/slides.html`](docs/slides.html).
- **Vídeo**: pendiente de grabar y enlazar. Guion en [`docs/video-script.md`](docs/video-script.md).

## Funcionalidades principales

- **Registro y autenticación** por email/contraseña (Supabase Auth), con recuperación de contraseña.
- **Completar perfil**: nombre, alias único, foto y selección de exactamente 5 cualidades personales.
- **Cuestionario de compatibilidad** de 36 preguntas, en un wizard de 6 bloques ponderados
  (5/5/15/20/25/30%), editable después de completado.
- **Selección automática de candidatos**: hasta 3 personas más afines por cualidades compartidas,
  calculada una única vez al completar el cuestionario.
- **Análisis de compatibilidad por IA** (Groq, con OpenRouter como alternativa): puntuación por 6
  dimensiones y explicación por pregunta, sin exponer nunca el texto de ninguna respuesta.
- **Dashboard de resultados**: tarjeta por candidato con score final, gráfico radar por dimensión y
  detalle expandible por pregunta; se actualiza solo mientras el análisis está en curso.
- **Recalcular compatibilidad** bajo demanda tras editar las propias respuestas o cualidades.
- **Chat interno** entre usuarios ya comparados entre sí.
- **Configuración**: edición de perfil, cuestionario y contraseña desde una única pantalla.
- **Diseño responsive** en las 12 pantallas de la aplicación.

## Usuario y contraseña de prueba

La aplicación tiene login (Supabase Auth). Dos cuentas de prueba, ambas con la misma contraseña,
ninguna con datos personales reales — son usuarios sintéticos de `supabase/seed/`:

- **Con resultados ya calculados** (dashboard, radar y chat visibles sin rellenar nada):
  - Email: `elena.luna@seed.compatibility-check.local`
  - Contraseña: `Afinia-TFM-2026!`
- **Cuenta nueva, sin perfil** (para probar el alta completa: perfil, cuestionario, matching):
  - Email: `demo@seed.compatibility-check.local`
  - Contraseña: `Afinia-TFM-2026!`
  - Para rellenar el cuestionario de 36 preguntas sin pensar cada respuesta:
    [`docs/respuestas-ejemplo-cuestionario.md`](docs/respuestas-ejemplo-cuestionario.md) — cópialas y
    pégalas tal cual, bloque a bloque.

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
`SUPABASE_SERVICE_ROLE_KEY` de ese proyecto antes de `npm run seed`. El seed nunca fija ni resetea la
contraseña de una cuenta que ya existe (crea cada cuenta nueva con una al azar, y no la toca en
re-seeds posteriores) — las dos cuentas de prueba documentadas más abajo tienen su contraseña fijada
a mano desde el Dashboard de Supabase, fuera de este script, precisamente para poder documentarla.

## Limitaciones de las herramientas gratuitas (importante antes de una demo en vivo)

Todo el stack corre en planes gratuitos (design.md, decisión 10) — esto es lo que hay que tener en
cuenta de cara a una presentación en vivo, con lo ya confirmado real durante la tarea 20.2 (verificación
end-to-end) marcado explícitamente:

- **Groq — límite de tokens/minuto (confirmado real, mitigado)**: el free tier de Groq limita
  `openai/gpt-oss-120b` a 8.000 tokens/minuto. Analizar las 36 preguntas de una comparación (6 lotes)
  agotaba ese presupuesto con una sola comparación —el modelo gasta de media ~1.000-1.300 tokens
  ocultos de "razonamiento" por lote, además del propio contenido—, así que las 3 comparaciones
  creadas de golpe al completar el cuestionario dejaban 2 de cada 3 en `error` incluso con
  reintentos (reproducido de verdad contra la API real de Groq, no solo sospechado). **Mitigado en
  tres frentes** (`apps/backend/src/ai/`, ver `openspec/changes/archive/` para el detalle de cada
  decisión):
  1. `reasoning_effort: 'low'` en cada petición — ~38% menos tokens por lote, misma calidad de
     puntuación/explicación comprobada con los mismos datos reales.
  2. Backoff entre reintentos realista (10s/25s, no los 50/150ms iniciales — Groq pide esperar ese
     margen tras un `429`, y 50/150ms nunca alcanzaba a recuperarse).
  3. **Analizar solo 6 preguntas muestreadas (1 al azar de cada uno de los 6 bloques del
     cuestionario) en vez de las 36 completas** — medido contra la API real
     (`tokens ≈ 600 + 292 × preguntas`): las 3 comparaciones de una tacada caben con margen dentro
     del presupuesto del minuto, cosa que 36 preguntas no permitían ni con `reasoning_effort: 'low'`.
     El muestreo es estratificado por bloque (nunca aleatorio puro sobre las 36) para no arriesgarse
     a dejar sin representar el bloque de mayor peso (30%). Efecto colateral positivo: ahora se
     envían menos respuestas del usuario al proveedor externo de IA por comparación (6 de 36, no
     todas).

  Si una comparación aun así quedara en `error`, el botón de reintentar
  (`POST /comparisons/:id/reanalyze`) vuelve a muestrear 6 preguntas nuevas al azar.
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
