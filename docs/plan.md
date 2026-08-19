> **Nota de procedencia**: este documento es una copia versionada en el repo del plan técnico
> gestionado por el modo de planificación de Claude Code (originalmente en
> `~/.claude/plans/quiero-desarrollar-la-siguiente-effervescent-lovelace.md`). Para el detalle
> formal por capacidad (requisitos y escenarios vigentes) usa `openspec/specs/`; el cambio original
> que los generó (`proposal.md`/`design.md`/`tasks.md`, con las tareas y decisiones que llevaron
> hasta ahí) queda archivado en
> `openspec/changes/archive/2026-08-18-build-compatibility-mvp/`. Este plan es la narrativa completa
> de contexto y decisiones — si se actualiza uno, hay que mantener el otro sincronizado.

# Propuesta técnica — App de simulación de cita basada en un cuestionario de 36 preguntas de compatibilidad (TFM)

## Contexto

Este desarrollo es la base de un TFM: los usuarios responden a un cuestionario de 36 preguntas de
compatibilidad (el objetivo es medir afinidad entre personas, no dictaminar si podrían enamorarse); sus
respuestas se guardan como JSON con una estructura prefijada; un LLM (vía API Key) compara cada par de
respuestas y puntúa la compatibilidad en 6 dimensiones con pesos distintos (emocional 20%, valores 25%,
estilo comunicativo 10%, intereses 25%, madurez 10%, apertura/extroversión 10%); y se muestra un
resultado final agregado. Se necesita además una semilla de cuestionarios ya rellenados en BD para
poder demostrar/probar la comparación sin depender de usuarios reales.

**A diferencia de un emparejamiento 1-a-1 por código, la comparativa se realiza contra un grupo más
amplio de personas ya registradas en BD**, mediante una fase previa de "afinidad por cualidades": el
usuario elige 5 cualidades personales de una lista de 15; el sistema busca en BD los 3 usuarios (reales
o seed) con más cualidades coincidentes con esa selección (pre-compatibilidad), y solo con esos 3 se
ejecuta la comparación de compatibilidad vía IA (6 preguntas muestreadas por comparación desde
2026-08-19, no las 36 completas — ver "Orquestación de las llamadas a IA"). El resultado final se presenta como una
gráfica por cada uno de los 3 candidatos, acompañada de su foto — por lo que el registro de usuario
incluye la subida de una foto, y los usuarios seed llevan fotos genéricas de ejemplo.

**El alta requiere autenticación real por email y contraseña**, en dos pasos: (1) pantalla de
autenticación con email + contraseña, comprobando que el email no exista ya (o login con esas mismas
credenciales, con opción de recuperar contraseña por email); (2) una vez autenticado, un **wizard de 2
pasos** para completar el perfil — paso 2a: nombre, **alias único** y la foto; paso 2b: la selección de
las 5 cualidades. Las 15 cualidades se muestran como **píldoras** independientes seleccionables: al
llegar a 5 marcadas, las píldoras restantes se deshabilitan (no se puede marcar una sexta) hasta
desmarcar alguna; el envío (al terminar el paso 2b) se bloquea mientras la selección no sea exactamente
5, pero el resto de campos (nombre, alias, foto, en el paso 2a) se pueden rellenar sin esa restricción.
Sin completar este perfil, ninguna otra pantalla es accesible (`ProfileGuard`). La interfaz autenticada
muestra en la esquina superior derecha un icono de chat, un botón de configuración y un botón de cerrar
sesión para editar más adelante contraseña, nombre, alias, foto y cualidades.

**Edición y recálculo bajo demanda**: desde la página de perfil, el usuario puede editar también sus
respuestas del cuestionario y su selección de cualidades. Cualquiera de las dos ediciones habilita un
atajo de "recalcular compatibilidad" **en la propia pantalla de Configuración** (nota, 2026-08-19: vivía
también, de forma redundante, en el dashboard — retirado de ahí a petición explícita de la usuaria, ver
`openspec/changes/archive/*-simplify-dashboard-recalculate`), que vuelve a seleccionar candidatos y
relanza el análisis IA **solo para ese usuario** (sin afectar a otros usuarios que lo tuvieran como
candidato). La página principal de la app es el cuestionario mientras el usuario no lo haya completado
nunca, y pasa a ser el dashboard de resultados una vez completado — el dashboard se refresca solo,
sondeando mientras el análisis sigue en curso, sin necesitar un F5 manual.

El repo (`C:\CompatibilityCheckApp\compatibility-check-app`) está prácticamente vacío: solo un
`README.md` con el título y un `.gitignore` de Angular CLI (sin `angular.json` ni código). Esto
confirma que la intención original apuntaba a un frontend Angular, pero todo el resto (backend, BD,
código) está por crear.

**Objetivo de esta fase:** decidir arquitectura y stack (viabilidad) para una v1 acotada, gratuita de
desplegar, y coherente con el perfil de la usuaria (.NET, AngularJS, SQL Server), dejando la puerta
abierta a ampliaciones futuras (más idiomas, más de 2 personas, otros cuestionarios, etc.) sin que
formen parte del alcance actual.

## Decisión de stack (viabilidad)

| Capa | Elección | Por qué |
|---|---|---|
| Frontend | **Angular + TypeScript** | Transferencia directa desde AngularJS; coincide con el `.gitignore` ya presente en el repo. |
| Backend | **NestJS (Node.js + TypeScript)** | Arquitectura por decoradores/módulos/DI casi calcada de ASP.NET Core (Controllers, Services, `[ApiController]` ≈ `@Controller`), así que la transición desde .NET es mínima. A la vez, TypeScript/Node es más natural que un lenguaje puramente OO para manipular JSON dinámico y orquestar llamadas async a APIs de IA — el punto que la propia usuaria señaló. |
| Base de datos | **PostgreSQL vía Supabase (free tier)** | Relacional como SQL Server (SQL transferible), con columnas `JSONB` para la estructura prefijada de respuestas/resultados. |
| Almacenamiento de fotos | **Supabase Storage (free tier, ~1GB)** | Mismo proyecto que la BD, un único proveedor/API key que gestionar; genera URLs públicas para pintar la foto de cada candidato en el dashboard. |
| UI / diseño | **AfinIA** (nombre de marca, con logo propio) sobre **Bootstrap 5 + Bootstrap Icons** (vía `@ng-bootstrap/ng-bootstrap` para componentes interactivos que sí lo necesitan — modales, dropdowns; el cuestionario usa un estado propio, no `NgbAccordion`/`NgbNav`), recompilado desde Sass con **paleta propia** (`#FB8500` Princeton Orange, `#BE1E2D` Carmine, `#000000` texto/oscuro y **relleno del botón de acción principal en toda la app** — `btn-dark`, no `btn-primary`, `#FDF0D5` Papaya Whip fondo suave, `#FFFFFF` blanco base) y **tipografía Poppins** (alternativas: DM Sans/Roboto) | Sistema de diseño único para toda la interfaz (layout, formularios, botones, tarjetas, cabecera) e iconografía, sin CSS a medida ni mezclar librerías de iconos. Los ejemplos oficiales de Bootstrap (*Sign-in*, *Dashboard*, *Album*) sirven de esqueleto de partida para cada shell/patrón, reskinado con los tokens propios — el cuestionario ya no se basa en el ejemplo *Accordion*, es un wizard de 6 pasos con una pregunta a pantalla completa (ver más abajo). Una **landing pública** (fondo degradado, animación de entrada del logo) precede a cualquier pantalla de autenticación. **La interfaz es completamente responsive** (móvil <768px, tablet 768–991px, escritorio ≥992px) usando el grid y utilidades responsive de Bootstrap, ya que no hay app nativa/APK — el acceso es exclusivamente web. Todo esto está codificado como skill de Claude Code en `.claude/skills/ui-design-consistency/` para que las 12 pantallas sean coherentes entre sí sin depender de recordarlo manualmente. |
| Autenticación | **Supabase Auth (email/contraseña)** | Mismo proyecto que la BD/Storage; hashea y guarda la contraseña en la misma Postgres, emite JWT de sesión y resuelve el email de recuperación de contraseña con su SMTP gratuito — sin implementar hashing, tokens ni envío de email a mano, y sin proveedor de email adicional que gestionar. El frontend Angular llama a Supabase Auth directamente (`@supabase/supabase-js`); el backend solo valida el JWT en un guard. |
| IA | **Groq API** (modelo open-weight `openai/gpt-oss-120b`, ver nota) como proveedor principal; **OpenRouter** mencionado como alternativa/comparativa | Free tier rápido, buen soporte de salida JSON estructurada ("JSON mode"), modelos open source. **Nota**: el modelo original de esta fila era Llama 3.3 (`llama-3.3-70b-versatile`) — dejó de existir en el catálogo de Groq y se sustituyó en la tarea 20.2 (verificación end-to-end); Groq retira modelos con cierta frecuencia, así que el nombre exacto puede volver a necesitar actualizarse (`GET /openai/v1/models` confirma el catálogo vigente con la misma API key). **Nota 2 (2026-08-19)**: el free tier de Groq limita `openai/gpt-oss-120b` a 8.000 tokens/minuto — analizar las 36 preguntas completas de una comparación (6 lotes) agotaba ese presupuesto con una sola comparación, dejando 2 de las 3 comparaciones de un usuario nuevo en `error`. Mitigado analizando solo **6 preguntas muestreadas (1 al azar por bloque)** en vez de las 36, con `reasoning_effort: 'low'` y un backoff entre reintentos de 10s/25s (no 50/150ms) — ver la sección "Orquestación de las llamadas a IA" más abajo y `openspec/changes/archive/2026-08-19-sample-questions-per-block/design.md` para las alternativas consideradas. OpenRouter se investigó como alternativa real (no solo mencionada): su tier gratuito resultó poco fiable ahora mismo (modelos `:free` retirados sin aviso o saturados por la demanda compartida de todos sus usuarios, 429 fuera de nuestro control) — se descartó por eso, no por falta de intento. |
| Despliegue gratuito | **Frontend en Vercel + Backend en Render + BD/Auth en Supabase**, todo con su integración Git nativa (sin Terraform, sin YAML de despliegue propio) | Combinación 100% free tier sin tarjeta de crédito, estándar para proyectos académicos. CI (lint+test+build, unitarios e integración) vive en GitHub Actions como puerta de calidad antes de mergear — el despliegue en sí lo dispara cada plataforma por su cuenta, no un job de Actions (ver "CI/CD, sin Terraform" más abajo). |
| Logs | **`nestjs-pino`** (backend), único destino stdout en Render (tail en vivo) | JSON estructurado de fábrica con contexto por módulo/`comparison_id`. Sin proveedor externo de persistencia: se evaluó Better Stack/Logtail y se descartó en la tarea 19.1 por la fricción de su alta (exigía una integración adicional ajena al proyecto sin poder omitirla) — limitación aceptada, sin histórico buscable más allá de la sesión reciente de Render (ver `design.md` decisión 8b). |

No hay incompatibilidades entre estas piezas; el resto del documento detalla cómo encajan.

## Justificación arquitectónica desde Clean Code / Clean Architecture

La estructura por módulos elegida (ver árbol de carpetas más abajo) no es solo una cuestión de gusto:
cada decisión responde a un principio concreto, lo cual conviene incluir en la memoria del TFM como
justificación técnica del diseño:

- **Responsabilidad única (SRP)**: cada módulo de NestJS hace una sola cosa y la hace explícita en su
  nombre — `matching/candidate-selector.service.ts` solo calcula pre-compatibilidad y selecciona los 3
  candidatos; `comparisons/weighting.util.ts` solo agrega las puntuaciones por pregunta (6
  muestreadas por comparación desde 2026-08-19, no siempre 36) con los pesos; `ai/`
  solo orquesta llamadas al LLM. Ningún servicio mezcla cálculo de negocio con acceso a datos ni con
  llamadas HTTP externas.
- **Inversión de dependencias (DIP) e Open/Closed**: `ai/` define una interfaz (`ai-provider.interface.ts`)
  que `groq.provider.ts` y `openrouter.provider.ts` implementan por igual; el orquestador depende de
  esa interfaz, no de un proveedor concreto. Añadir un tercer proveedor de IA en el futuro (u otro
  modelo) no exige tocar `ai-orchestrator.service.ts`, solo añadir una nueva implementación — el
  sistema queda abierto a extensión y cerrado a modificación.
- **Independencia de infraestructura (persistence ignorance)**: la lógica de dominio (selección de
  candidatos, cálculo ponderado, validación del JSON de la IA) no llama directamente al cliente de
  Supabase ni conoce SQL; pasa por `supabase/supabase.service.ts` como única puerta de acceso a datos.
  Esto permite testear `weighting.util.ts` o `candidate-selector.service.ts` con datos en memoria, sin
  levantar base de datos real — clave para poder incluir pruebas unitarias reales en la memoria del TFM.
- **Funciones puras donde es posible**: `weighting.util.ts` se diseña como función pura (entrada:
  array de resultados por pregunta + pesos; salida: objeto agregado), sin efectos secundarios ni
  dependencias ocultas — fácil de razonar, de testear y de auditar el cálculo matemático que sustenta
  el resultado final mostrado al usuario.
- **Contrato único y sin duplicación (DRY)**: `packages/shared-types` es la única fuente de verdad del
  JSON prefijado de respuestas y de resultado de comparación; backend y frontend importan las mismas
  interfaces en vez de mantener dos definiciones que podrían desincronizarse.
- **Fronteras explícitas de validación**: los DTOs de entrada en los controllers (ej. `POST /users`,
  `POST /users/:id/questionnaire`) validan forma y tipos antes de que el dato entre a la capa de
  negocio; la validación de la salida de la IA con **Zod** cumple el mismo papel en el borde opuesto
  (LLM → sistema), evitando que datos mal formados contaminen la base de datos o el dashboard.
- **Nombres intencionales**: se evitan carpetas/archivos genéricos tipo `utils/` o `helpers/` sin
  más — cada archivo lleva un nombre que describe qué hace (`photo-upload.service.ts`,
  `candidate-selector.service.ts`), siguiendo la recomendación de Clean Code de que el nombre debería
  hacer innecesario el comentario explicativo.
- **Separación de la identidad respecto al dominio**: la autenticación (email, contraseña, sesión) se
  delega por completo en Supabase Auth y no se mezcla con la tabla de perfil `users`; el backend solo
  añade un guard que valida el JWT recibido, sin absorber responsabilidad de identidad — otro ejemplo
  de responsabilidad única aplicado a nivel de sistema, no solo de clase.
- **Mediator/CQRS selectivo (`@nestjs/cqrs`)**: se usa el equivalente NestJS de MediatR, pero solo donde
  aporta desacoplamiento real, no como patrón uniforme. Ver la sección "Mediator/CQRS" más abajo.

En conjunto, esto permite documentar en la memoria no solo qué stack se usó, sino *por qué la
arquitectura resultante es mantenible, testeable y extensible* — un punto que suele valorarse en la
evaluación de un TFM.

## Mediator/CQRS selectivo (`@nestjs/cqrs`)

Se incorpora `@nestjs/cqrs` (el equivalente NestJS de MediatR) de forma **selectiva**, no como patrón
uniforme para todo el backend — encaja además con el bagaje de la usuaria en .NET, donde MediatR es un
patrón ya conocido:

- **Commands** para las operaciones de escritura con efectos relevantes: `CreateUserProfileCommand`,
  `CompleteQuestionnaireCommand`, `AnalyzeComparisonCommand`, `RecalculateCompatibilityCommand` (ver
  "Recálculo manual bajo demanda" más abajo). Cada una con su Handler, testeado de forma aislada
  (encaja con la metodología TDD ya adoptada).
- **Events** para encadenar módulos sin acoplarlos, sustituyendo las llamadas directas
  servicio-a-servicio previstas inicialmente entre `questionnaires` → `matching` → `ai`:
  `questionnaires` publica `QuestionnaireCompletedEvent` al terminar (sin conocer `matching`); el
  handler de `matching` calcula los candidatos y, si crea comparaciones, publica
  `ComparisonsCreatedEvent`; el handler de `ai` reacciona a ese evento disparando la orquestación de
  cada comparación. Añadir un futuro listener (p. ej. una notificación) no exige tocar `questionnaires`
  ni `matching` — el mismo principio abierto/cerrado ya aplicado a los proveedores de IA.
- **Un único pipeline de logging** enganchado al `CommandBus` registra automáticamente inicio, fin y
  resultado de cada Command con su ID de correlación, evitando repetir logging manual en cada handler —
  es justo lo que exige la metodología de logging estructurado del proyecto.
- **Las lecturas simples NO se convierten en Queries**: `GET /qualities`, `GET /users/me`,
  `GET /users/me/comparisons`, `GET /comparisons/:id/detail` siguen siendo servicios NestJS normales;
  formalizarlas como `Query`/`QueryHandler` añadiría archivos sin beneficio real para el tamaño de este
  TFM.

## Arquitectura: monorepo único

Un solo repo con npm workspaces (frontend Angular + backend NestJS + tipos compartidos), para que el
contrato JSON (estructura de respuestas y de resultado de comparación) no se desincronice entre ambos
lados, y para simplificar la memoria del TFM (un único diagrama de arquitectura).

```
compatibility-check-app/
├── package.json                      # workspaces: ["apps/*", "packages/*"]
├── docs/
│   ├── architecture.md               # diagrama para la memoria
│   └── decisions/                    # ADRs breves (stack, orquestación IA, pesos)
├── packages/shared-types/src/
│   ├── questions.ts                  # las 36 preguntas (id, texto, categoría)
│   ├── answer-set.ts                 # interfaz AnswerSet (JSON prefijado de respuestas)
│   ├── comparison-result.ts          # interfaz ComparisonResult (JSON prefijado del análisis IA)
│   └── aggregated-result.ts          # interfaz AggregatedResult + pesos por dimensión
├── apps/backend/src/                 # NestJS
│   ├── auth/                         # guard de JWT de Supabase (sección 4)
│   │   ├── supabase-auth.guard.ts
│   │   └── supabase-token.ts         # resolución de usuario reutilizable (guard estricto y opcional)
│   ├── users/                        # perfil (nombre + alias + foto + 5 cualidades)
│   │   ├── users.controller.ts       # arranca en la sección 4 solo con GET /users/check-alias (público)
│   │   ├── commands/create-user-profile.command.ts (+ handler)
│   │   └── photo-upload.service.ts   # sube a Supabase Storage vía service_role key
│   ├── qualities/                    # catálogo de las 15 cualidades personales
│   ├── questionnaires/               # recepción de las 36 respuestas del usuario
│   │   ├── commands/complete-questionnaire.command.ts (+ handler, publica QuestionnaireCompletedEvent)
│   │   └── events/questionnaire-completed.event.ts
│   ├── matching/                     # cálculo de pre-compatibilidad y selección top 3
│   │   ├── candidate-selector.service.ts
│   │   ├── handlers/questionnaire-completed.handler.ts (escucha el evento, publica ComparisonsCreatedEvent)
│   │   └── events/comparisons-created.event.ts
│   ├── ai/                           # orquestación de llamadas a IA
│   │   ├── groq.provider.ts / openrouter.provider.ts   (mismo contrato/interfaz)
│   │   ├── ai-orchestrator.service.ts
│   │   ├── commands/analyze-comparison.command.ts (+ handler)
│   │   ├── handlers/comparisons-created.handler.ts (escucha el evento, despacha AnalyzeComparisonCommand)
│   │   ├── prompts/compatibility-prompt.ts
│   │   └── schemas/comparison-result.schema.ts          (Zod, valida la salida del LLM)
│   ├── comparisons/                  # una comparación = usuario vs. 1 candidato
│   │   └── weighting.util.ts         # cálculo del agregado ponderado (igual que antes)
│   ├── chat/                         # NUEVO: conversaciones y mensajes (internal-chat)
│   │   ├── chat.controller.ts
│   │   └── chat.service.ts           # valida elegibilidad contra comparisons con service_role
│   └── supabase/supabase.service.ts
├── apps/frontend/src/app/
│   ├── features/landing/             # NUEVO: pantalla pública en "/", antes de cualquier shell
│   ├── core/shell/                   # NUEVO: cabecera con iconos de chat, configuración y logout
│   ├── features/auth/                # NUEVO: login, registro paso 1, forgot/reset password (Shell B, degradado)
│   ├── features/registration/        # paso 2: wizard de 2 pasos (foto+nombre+alias / píldoras de 5 cualidades)
│   ├── features/settings/            # NUEVO: editar contraseña, nombre, alias, foto, cualidades y acceso al cuestionario
│   ├── features/questionnaire/       # 36 preguntas, wizard de 6 pasos + bienvenida (solo creación)
│   ├── features/processing/          # calculando candidatos + analizando (polling)
│   ├── features/results-dashboard/   # hasta 3 tarjetas (foto + alias + score + radar) + detalle + Chatear
│   └── features/chats/               # NUEVO: listado de conversaciones + features/chats/:id (chat)
└── supabase/
    ├── migrations/0001_init.sql      # incluye conversations/messages
    ├── storage/ (bucket "user-photos", fotos genéricas para seed)
    └── seed/seed-users.json + seed.ts
```

## Autenticación y perfil

- **Identidad**: Supabase Auth gestiona `auth.users` (email, contraseña hasheada, sesión JWT). El
  frontend llama directamente a `supabase.auth.signUp/signInWithPassword/signOut/
  resetPasswordForEmail/updateUser` — el backend no reimplementa nada de esto.
- **Perfil de negocio**: tabla propia `users` con `id` como FK 1:1 a `auth.users.id` (no se duplica
  email/contraseña). Guarda solo `name` (nombre para mostrar en el perfil propio), `alias` (identificador
  público único, mostrado en las tarjetas de resultados), `photo_url` y `questionnaire_completed_at`.
- **Seguridad de acceso**: Row Level Security en `users`/`user_qualities`/`questionnaires`
  (`auth.uid() = id`/`user_id`) para que cada usuario solo pueda leer/editar su propia fila desde el
  cliente; las lecturas cruzadas necesarias para el matching las hace el backend con la `service_role`
  key, nunca el navegador directamente.
- **Cambio de contraseña**: la pantalla de configuración exige la contraseña actual (se reintenta
  `signInWithPassword` con ella para confirmarla) antes de llamar a `updateUser({password})`.
- **Cualidades como píldoras** (rediseño sobre mockup — ya no cards): las 15 se muestran como
  elementos seleccionables independientes (`rounded-pill`); desmarcar es siempre libre, pero al llegar a
  5 marcadas las píldoras restantes se deshabilitan (no se puede marcar una sexta hasta desmarcar
  alguna) — el límite se hace cumplir en la propia interacción, no solo al enviar. El botón de enviar
  (registro paso 2 o guardado en configuración) permanece además deshabilitado mientras la selección no
  sea exactamente 5 — el resto de campos del formulario no se bloquean por esto. La validación de
  "exactamente 5" se repite en el backend como fuente de verdad.
- **Completar perfil como wizard de 2 pasos** (paso 2a: foto + nombre + alias; paso 2b: cualidades) —
  ver "Frontend Angular" más abajo. Es una división puramente de cliente: sigue siendo un único
  `POST /users/me/profile` al terminar el paso 2b.
- **Sin perfil, cualquier ruta redirige a completar perfil paso 1**: un usuario autenticado sin fila en
  `users` no puede llegar a ninguna otra pantalla (dashboard, cuestionario, configuración, chats) por
  URL directa ni de otra forma — un `ProfileGuard` de Angular lo redirige siempre a completar perfil,
  tanto justo tras el login como en cualquier intento de navegación posterior, hasta que complete su
  perfil.

## Modelo de datos (PostgreSQL / Supabase)

- `users` (`id` FK a `auth.users.id`, `name`, `alias` — `UNIQUE`, `photo_url` — apunta al bucket de
  Supabase Storage, `questionnaire_completed_at`, `needs_recalculation boolean default false` — se
  activa al editar respuestas o cualidades, habilita el botón de recalcular y se desactiva al ejecutarlo)
- `qualities` (id, name) — catálogo fijo de las 15 cualidades personales, **confirmado**: empatía,
  humor, ambición, creatividad, honestidad, aventura, estabilidad, curiosidad, generosidad, paciencia,
  sociabilidad, independencia, sensibilidad, disciplina, espontaneidad.
- `user_qualities` (user_id, quality_id) — exactamente 5 filas por usuario, las cualidades elegidas en
  el registro.
- `questionnaires` (user_id único, `answers jsonb` — array de 36 `{questionId, question, answer}`) —
  ya no depende de un `match_id`; el cuestionario es del usuario en sí, no de una pareja concreta.
- `comparisons` (id, requester_user_id, candidate_user_id, shared_qualities_count — la
  pre-compatibilidad calculada en el momento de la selección, status: pending → analyzing →
  completed/error) — una fila por cada uno de los 3 candidatos elegidos para un usuario, con
  `on delete cascade` hacia sus resultados por pregunta y agregado (necesario para poder sustituir las
  comparaciones de un usuario al recalcular).
- `comparison_question_results` (comparison_id, question_id, `result jsonb` — exactamente el JSON
  pedido: `pregunta, id_usuario_1, respuesta_usuario_1, id_usuario_2, respuesta_usuario_2,
  compatibilidad, emocional, valores, estilo, intereses, madurez, apertura, explicación`). **Este
  registro completo se guarda en BD tal cual, pero nunca se expone así al frontend**: el endpoint de
  detalle filtra `respuesta_usuario_1`/`respuesta_usuario_2` antes de responder — el dashboard no debe
  mostrar el texto de las respuestas de ningún usuario, ni siquiera las propias, solo puntuaciones y la
  explicación de la IA (ver más abajo).
- `comparison_aggregated_results` (comparison_id único, compatibilidad_final + las 6 dimensiones,
  `weights jsonb` con **ambos** vectores de pesos usados: por dimensión (20/25/10/25/10/10) y por
  bloque de preguntas (5/5/15/20/25/30))
- `conversations` (id, user_a_id, user_b_id — FK a `users.id`, normalizados `least`/`greatest` con
  `UNIQUE(user_a_id, user_b_id)` para no duplicar conversaciones entre el mismo par, `created_at`) —
  **sin FK a `comparisons`**: una conversación sobrevive aunque el candidato deje de serlo tras un
  recálculo.
- `messages` (id, conversation_id FK, sender_id FK a `users.id`, `body` texto no vacío, `created_at`,
  `read_at` nullable).

Las interfaces TypeScript de `answers` y `result` viven en `packages/shared-types` para que backend y
frontend compartan literalmente el mismo contrato.

### Selección de candidatos (pre-compatibilidad por cualidades)

Cuando un usuario termina de seleccionar sus 5 cualidades (antes incluso de rellenar el cuestionario,
o justo después — ver flujo abajo), el backend calcula, sobre todos los usuarios que ya tengan
cuestionario completo:

```sql
select u.id, u.alias, u.photo_url, count(*) as shared_qualities
from user_qualities uq
join users u on u.id = uq.user_id
where uq.quality_id in (:selectedQualityIds)   -- las 5 del usuario actual
  and u.id <> :currentUserId
  and u.questionnaire_completed_at is not null
group by u.id, u.alias, u.photo_url
order by shared_qualities desc, u.questionnaire_completed_at asc  -- desempate: el más antiguo primero
limit 3
```

Si hay menos de 3 usuarios disponibles en BD (caso posible antes de tener suficiente seed/usuarios
reales), se procede con los que haya (0, 1 o 2) y se informa en la UI. Este cálculo es una decisión de
diseño explícita a documentar en la memoria: la pre-compatibilidad por cualidades es solo un filtro de
_selección_ de candidatos, no entra en el cálculo ponderado final (que sigue basándose exclusivamente
en las respuestas comparadas por IA — una muestra de 6 por comparación desde 2026-08-19, no las 36
completas).

**Regla de diseño fija (v1): el cálculo de candidatos y sus comparaciones se ejecuta una única vez, en
el momento en que el propio usuario termina su cuestionario, y nunca se recalcula retroactivamente
para usuarios ya existentes cuando se incorpora gente nueva al pool.** Motivo, a documentar
explícitamente en la memoria del TFM: si al unirse un usuario nuevo se recalcularan también las
comparaciones de todos los usuarios ya existentes (para que puedan "descubrir" al recién llegado como
posible mejor candidato), el coste de llamadas a la IA pasaría de ser lineal y acotado (18 llamadas —
3 comparaciones × 6 batches — por cada usuario nuevo) a **O(N) por cada incorporación** (con 20
usuarios ya en el pool, una sola alta dispararía hasta 360 llamadas adicionales), lo que agotaría muy
rápido el rate limit y la cuota diaria del free tier de Groq durante una demo. Mantener el cálculo
como "una vez por usuario, en el momento de su propio alta" evita ese riesgo sin renunciar a la
funcionalidad principal.

### Recálculo manual bajo demanda (excepción controlada a la regla anterior)

La regla de cálculo único sigue evitando la explosión O(N) de llamadas a la IA, pero admite una
excepción explícita y acotada: **el propio usuario** puede forzar el recálculo de **sus propias**
comparaciones tras editar sus respuestas o sus cualidades desde su perfil. Sigue siendo O(1) por acción
(máximo 18 llamadas, igual que el cálculo inicial) porque el efecto se limita a quien pulsa el botón —
nunca se propaga a otros usuarios que lo tuvieran como candidato.

Editar respuestas o cualidades marca `users.needs_recalculation = true`, lo que habilita el atajo
"recalcular compatibilidad" en Configuración (2026-08-19: retirado del dashboard por ser redundante con
este). Al activarlo se despacha `RecalculateCompatibilityCommand`,
cuyo handler reutiliza `candidate-selector.service.ts` (puede elegir candidatos distintos si las
cualidades cambiaron), **elimina las comparaciones anteriores del usuario** (cascada ya prevista en el
esquema) y publica de nuevo `ComparisonsCreatedEvent` para que el mismo handler de `ai` dispare el
análisis — sin duplicar lógica entre el flujo inicial y el de recálculo. Al terminar, se desmarca
`needs_recalculation`. No se conserva histórico de comparaciones anteriores en v1 (se sustituyen, no se
archivan); queda como posible línea futura mostrar "cómo ha cambiado tu compatibilidad con el tiempo".

## Endpoints backend clave

Login/registro/logout/recuperar contraseña **no pasan por el backend**: el frontend llama directamente
a Supabase Auth. El backend expone lo relativo al perfil de negocio y al dominio, protegido por un
guard que valida el JWT de Supabase:

```
GET   /qualities                      → catálogo de las 15 cualidades personales (público)
GET   /users/check-alias?alias=...    → disponibilidad de un alias (público a propósito, sin exigir
                                         sesión; si la petición sí trae un JWT válido, excluye el
                                         propio alias del usuario autenticado de la comprobación)
POST  /users/me/profile               → (autenticado) multipart/form-data { name, alias, photo, qualityIds[5] }
                                         valida alias único, sube la foto a Supabase Storage, crea el
                                         perfil + user_qualities
GET   /users/me                       → (autenticado) perfil propio (incluye needs_recalculation)
PATCH /users/me                       → (autenticado) edita name/alias/photo/qualityIds con las mismas
                                         validaciones que la creación; marca needs_recalculation=true
                                         solo si qualityIds difiere de lo almacenado
PUT   /users/me/questionnaire/draft    → (autenticado) guarda entre 0 y 36 respuestas en cualquier
                                         momento, sin exigir el conjunto completo; nunca marca
                                         questionnaire_completed_at ni dispara análisis
GET   /users/me/questionnaire         → (autenticado) devuelve las respuestas guardadas hasta el
                                         momento (parciales o completas), para prerellenar el formulario
                                         al abrir el cuestionario o al iniciar sesión de nuevo
POST  /users/me/questionnaire         → (autenticado) primer envío final, exige las 36 respuestas
                                         completas; calcula los 3 candidatos (matching.service) y crea
                                         3 filas en `comparisons` (status pending), dispara el análisis
                                         IA de cada una en background; rechaza si ya existe cuestionario
                                         completado o si faltan respuestas
PATCH /users/me/questionnaire         → (autenticado) edita las 36 respuestas de un cuestionario ya
                                         completado; marca needs_recalculation=true, no dispara análisis
GET   /users/me/comparisons           → (autenticado) estado de las 3 comparaciones
                                         (pending/analyzing/completed) + datos básicos del candidato
                                         (alias, foto, shared_qualities) + resultado agregado
GET   /comparisons/:id/detail         → (autenticado) detalle de las comparaciones por pregunta (6
                                         muestreadas por comparación desde 2026-08-19, no 36):
                                         pregunta, puntuaciones por dimensión, compatibilidad y
                                         explicación de la IA — **nunca** respuesta_usuario_1/2, aunque
                                         sí existan en el registro de BD
POST  /comparisons/:id/reanalyze      → (autenticado) reintento manual si status = 'error'
POST  /users/me/recalculate           → (autenticado) solo si needs_recalculation=true: vuelve a
                                         seleccionar candidatos, sustituye las comparaciones anteriores
                                         y relanza el análisis IA; desmarca needs_recalculation

POST  /conversations                  → (autenticado) { candidateUserId }; exige que candidateUserId
                                         sea uno de los propios candidatos en `comparisons`
                                         (requester_user_id = yo); crea la conversación o devuelve la
                                         existente (idempotente)
GET   /conversations                  → (autenticado) listado de conversaciones propias (iniciadas por
                                         mí o por otros), con alias/foto del otro participante, último
                                         mensaje y contador de no leídos, ordenadas por actividad
GET   /conversations/:id/messages     → (autenticado, solo participantes) mensajes en orden
                                         cronológico; marca como leídos los dirigidos al usuario actual
POST  /conversations/:id/messages     → (autenticado, solo participantes) { body } no vacío
```

El análisis se dispara de forma desacoplada vía eventos (`@nestjs/cqrs`), no con una llamada directa
`questionnaires` → `matching` → `ai`: al guardar las 36 respuestas, `CompleteQuestionnaireCommandHandler`
publica `QuestionnaireCompletedEvent`; el handler de `matching` calcula los 3 candidatos y publica
`ComparisonsCreatedEvent`; el handler de `ai` reacciona disparando la orquestación de cada comparación
en background. El frontend hace polling de `GET /users/me/comparisons` hasta que las 3 filas estén en
`status = 'completed'` (o `'error'`).

## Orquestación de las llamadas a IA

- **Actualizado 2026-08-19 (bug real de producción, ver `openspec/changes/archive/
  2026-08-19-sample-questions-per-block`)**: cada comparación ya no analiza las 36 preguntas
  completas, solo **6 muestreadas — 1 al azar de cada uno de los 6 bloques del cuestionario** —,
  enviadas en una única llamada. Motivo: medido contra la API real de Groq, las 36 preguntas
  (6 lotes) agotaban el presupuesto de 8.000 tokens/minuto del free tier con una sola comparación,
  dejando 2 de las 3 comparaciones de un usuario nuevo en `error`; con 6 preguntas por comparación
  (~2.371 tokens medidos), las 3 comparaciones de un usuario nuevo caben con margen en ese mismo
  presupuesto. El muestreo es estratificado por bloque (nunca aleatorio puro sobre las 36) para
  preservar la representación proporcional de los pesos de bloque de abajo — un muestreo sin
  estratificar podría dejar sin representar el bloque de mayor peso (30%).
- Cada usuario genera **3 comparaciones** (una por candidato) → **3 llamadas en total por usuario
  nuevo** (1 por comparación, ya no 18). Las 3 comparaciones se siguen procesando con concurrencia
  limitada entre sí (1 comparación a la vez) — la infraestructura de lotes/concurrencia
  (`chunk`/`runWithConcurrencyLimit`, hasta 2 lotes en paralelo por comparación) se mantiene en el
  código por si en el futuro se ajustara el número de preguntas muestreadas por bloque a más de 1
  (dejaría de caber en un único lote), pero con 6 preguntas por comparación siempre resuelve en un
  solo lote.
- Prompt tipo "psicólogo especializado en relaciones" pidiendo explícitamente un **array JSON** con
  las claves exactas del ejemplo del usuario, usando el modo de salida estructurada de Groq.
- Validación de la respuesta con **Zod** contra el esquema esperado (claves presentes, valores en
  rango 1–10 con dos decimales). Si falla: reintento con backoff (máx. 3 intentos) reenviando el
  batch con instrucción de corrección; si sigue fallando, `comparison.status = 'error'` para reintento
  manual vía `/reanalyze`.
- **Cálculo del resultado final con ponderación compuesta (bloques dentro de dimensiones)**: dentro de
  cada una de las 6 dimensiones, la media nunca es simple sobre las preguntas analizadas — se agrupan
  según a qué uno de los **6 bloques del cuestionario** pertenecen (bloque 1 = preguntas 1–6, ...,
  bloque 6 = preguntas 31–36), con pesos incrementales por bloque: **5%, 5%, 15%, 20%, 25%, 30%**
  (las preguntas finales, más reveladoras, pesan más). Desde 2026-08-19 cada bloque aporta 1 sola
  pregunta muestreada al azar (ver más arriba), no las 6 — el cálculo no necesitó ningún cambio de
  código: la media de "1 elemento" es ese mismo valor, así que el peso de cada bloque se sigue
  aplicando igual. Las 6 medias de dimensión resultantes (ya ponderadas por bloque) se combinan
  después con los pesos por dimensión ya existentes
  (20/25/10/25/10/10) para dar `compatibilidad_final`. El campo `compatibilidad` per-pregunta se sigue
  guardando como dato informativo (detalle expandible) sin participar en este cálculo. Ambos vectores de
  pesos (`dimension` y `block`) se persisten en `comparison_aggregated_results.weights` para que el
  cálculo quede auditable en la memoria del TFM. La alineación "bloque de ponderación = lote de IA" es
  deliberada: reutiliza la misma agrupación de 6 preguntas para dos propósitos sin crear un segundo
  concepto de agrupación.

```ts
const BLOCK_WEIGHTS = [0.05, 0.05, 0.15, 0.20, 0.25, 0.30]; // bloques 1..6 (preguntas 1-6, 7-12, ...)
const blockIndexOf = (questionId: number) => Math.floor((questionId - 1) / 6); // 0..5

function weightedDimensionMean(results: ComparisonResult[], dimension: Dimension): number {
  const blockAverages = Array.from({ length: 6 }, (_, b) => {
    const inBlock = results.filter(r => blockIndexOf(r.questionId) === b);
    return average(inBlock.map(r => r[dimension]));
  });
  return round2(sum(blockAverages.map((avg, b) => avg * BLOCK_WEIGHTS[b])));
}
// compatibilidad_final = Σ_dimensión (peso_dimensión × weightedDimensionMean(dimensión))
```

## Frontend Angular

Pantallas (12 en total — ver `.claude/skills/ui-design-consistency/` para el marcado exacto de cada una):

0. **Landing pública** (`features/landing`, en `/`): antes de cualquier shell — no es Shell A (no hay
   sesión) ni Shell B (no es un formulario). Fondo degradado de marca (mismo que Shell B), logo que se
   ensambla trazo a trazo al cargar, titular + frase explicando el producto, y **un único botón** ("Iniciar
   sesión") hacia login. Si `/` se visita con sesión activa, la landing no se muestra — redirige directo
   a la resolución autenticada (completar perfil / cuestionario / dashboard, ver más abajo). Animación de
   entrada respeta `prefers-reduced-motion`.
1. **Autenticación** (`features/auth`, Shell B — fondo degradado a pantalla completa, sin card blanca):
   **Login** (email + contraseña + enlace "¿olvidaste tu contraseña?"), **Registro paso 1** (email +
   contraseña, comprobando que el email no exista ya, vía `supabase.auth.signUp`), y las pantallas de
   recuperación/nueva contraseña. El logo (blanco) aparece en las 4; solo login añade el wordmark
   "AfinIA", el resto muestra su propio título. El botón principal es siempre `btn-dark` (negro), no
   naranja — regla transversal a toda la app, no solo a estas pantallas.
2. **Completar perfil / Registro paso 2** (`features/registration`, Shell A minimalista — logo + solo
   cerrar sesión, sin chat/configuración): **wizard de 2 pasos** con paginación por puntos. Paso 2a:
   foto (preview circular antes de enviar), nombre, alias (validado en vivo contra
   `GET /users/check-alias`) — botón "Siguiente", solo avanza de paso, no envía nada. Paso 2b: 5 de las
   15 cualidades como **píldoras** (no cards): al llegar a 5 marcadas, las píldoras restantes se
   deshabilitan hasta desmarcar alguna — botón "Finalizar", que es el único punto que envía
   `POST /users/me/profile` con los datos de ambos pasos. **Sin perfil, no se puede llegar a ninguna otra
   pantalla** (`ProfileGuard`): cualquier intento de navegar a otra ruta redirige de vuelta aquí.
3. **Cuestionario de 36 preguntas** (`features/questionnaire`): en **modo creación** (primera vez), antes
   del wizard hay una pantalla de bienvenida (mismo fondo degradado, "Cuestionario de compatibilidad",
   botón "Iniciar") — se omite por completo en **modo edición** (desde configuración), que entra directo
   al wizard ya prerellenado. El wizard agrupa las 36 preguntas en **6 bloques de 6** (mismo agrupamiento
   del cálculo ponderado, pesos 5/5/15/20/25/30%), **nunca los 6 a la vez**: solo el bloque activo, con
   una flecha para volver al anterior (o salir del cuestionario desde el bloque 1). Encima, una **barra
   de progreso segmentada por peso** (6 tramos con ancho proporcional al peso, gradiente de blanco/crema
   a rojo/negro) — los bloques 1 y 2 pesan igual (5%) y se ven idénticos, y **el porcentaje nunca se
   muestra como texto**. La navegación entre bloques es libre, y cualquier bloque ya visitado se puede
   revisar/editar saltando directo desde su tramo, sin perder el punto más avanzado alcanzado (botón
   "Volver a donde estabas"). Dentro del bloque activo, **cada pregunta ocupa toda la pantalla, una a la
   vez** (ya no pestañas): una fila de 6 puntos + flechas prev/next debajo, clicables para saltar directo
   a una pregunta ya visitada, y el `textarea` a ancho completo con `rows="4"` mínimo. El progreso se
   autoguarda contra `PUT /users/me/questionnaire/draft` (nunca `localStorage`), precargado con
   `GET /users/me/questionnaire` al abrir. El botón del bloque 6 depende del modo: **"Enviar
   cuestionario"** en creación (→ `POST /users/me/questionnaire`, navega a procesando) o **"Guardar y
   recalcular compatibilidad"** en edición (→ encadena `PATCH /users/me/questionnaire` +
   `POST /users/me/recalculate` en un solo clic, navega al dashboard ya refrescado — sin paso manual
   aparte).
4. **Procesando** (`features/processing`): spinner + una fila por cada candidato ya seleccionado con su
   icono de estado (pendiente/analizando, completado, error) — **nunca un porcentaje agregado ni "N de
   3"**, porque el orden de finalización entre comparaciones no es predecible. El polling a
   `GET /users/me/comparisons` se detiene y navega al dashboard en cuanto todas están en
   `completed`/`error`.
5. **Dashboard de resultados** (`features/results-dashboard`): **hasta 3 tarjetas de resultado**, una por
   candidato, cada una con su foto, alias, score final destacado y un **gráfico radar de las 6
   dimensiones**; al expandir una tarjeta se ve el detalle de las preguntas analizadas (6 muestreadas
   desde 2026-08-19, no las 36 completas — ver "Orquestación de las llamadas a IA") con sus
   puntuaciones y la explicación de la IA — **nunca el texto de ninguna respuesta**, ni la propia ni la del candidato; solo
   puntuaciones y, opcionalmente, la justificación de la IA. Las tarjetas se ordenan de mayor a menor
   `compatibilidad_final`. Incluye el botón "recalcular compatibilidad" (`btn-dark`, habilitado solo si
   `needs_recalculation=true`), que llama a `POST /users/me/recalculate` y refresca el dashboard al
   completarse. Cada tarjeta incluye además un botón **"Chatear"** que inicia (o reutiliza, si ya
   existía) una conversación con ese candidato vía `POST /conversations` y navega a ella.
6. **Configuración** (`features/settings`): accesible desde el botón de ajustes de la cabecera, con 3
   secciones dentro de la misma card. **Perfil**: nombre, alias, foto y píldoras de cualidad (mismas
   reglas que el registro) — botón "Guardar cambios"; si cambiaron las cualidades, aparece un aviso con
   un atajo **"Recalcular compatibilidad ahora"** que llama directo a `POST /users/me/recalculate` sin
   tener que ir antes al dashboard. **Cuestionario**: un resumen (fecha de finalización) y un botón
   **"Editar tus respuestas"** que **navega** (no despliega inline) a `features/questionnaire` en modo
   edición — ver el punto 3 para el guardado combinado con recálculo. **Contraseña**: contraseña actual +
   nueva, con reautenticación.
7. **Chats** (`features/chats` y `features/chats/:id`): listado de todas las conversaciones del usuario
   (las que él inició y las que otros le iniciaron a él, aunque no le tengan como candidato propio),
   ordenadas por actividad reciente, con indicador de no leídos; al abrir una, la conversación muestra
   los mensajes en burbujas (propios a la derecha en `$primary`, del otro participante a la izquierda en
   `$light`) y un campo para responder. Se actualiza por sondeo (~4s con la conversación abierta, ~20-30s
   el contador de no leídos del menú) — sin WebSockets (ver `design.md` decisión 9).

Toda pantalla autenticada (salvo completar perfil, que solo lleva logo + cerrar sesión) comparte una
**cabecera** (`core/shell`) con, en la esquina superior derecha, el icono de chat (con indicador de no
leídos), el botón de configuración y el botón de cerrar sesión (`supabase.auth.signOut`), en ese orden.

**Enrutamiento de la página principal (`/`)**, en orden de prioridad: sin sesión → landing (punto 0); con
sesión pero **sin fila de perfil** → completar perfil paso 1, sin excepción, para cualquier ruta que se
intente (`ProfileGuard`); con perfil pero sin cuestionario completado nunca → cuestionario; con
cuestionario completado → dashboard de resultados, independientemente de si hay comparaciones pendientes
de análisis o de recálculo (el propio dashboard ya refleja esos estados intermedios).

**Responsive**: todas las pantallas se adaptan a móvil/tablet/escritorio con el grid de Bootstrap — la
cabecera colapsa a menú hamburguesa en móvil, el wizard del cuestionario y los formularios no generan scroll horizontal,
las tarjetas del dashboard pasan de 3 columnas en escritorio a 1 columna apilada en móvil, y el radar
chart (`ng2-charts`) se redimensiona al contenedor (`responsive: true`) en vez de tener tamaño fijo.

Librería de gráficos: **`ng2-charts`** (wrapper Angular de Chart.js) — soporta radar chart nativo,
gratuita (MIT) y con mejor soporte que `ngx-charts` para este tipo de gráfico. Al haber 3 resultados,
se pueden pintar 3 radares independientes (uno por tarjeta) para mantener la lectura simple.

## Fotos de usuario (Supabase Storage)

- Bucket público `user-photos` en Supabase Storage. El **backend** recibe la foto en `POST /users`
  (multipart) y la sube con la `service_role` key (evita exponer credenciales de Storage al
  frontend), devolviendo la `photo_url` pública para guardarla en `users.photo_url`.
- Validaciones mínimas en el backend: tipo de archivo (jpg/png/webp), tamaño máximo (ej. 2MB) para no
  agotar la cuota gratuita de Storage (~1GB).
- Los usuarios seed usan **fotos genéricas de ejemplo** (avatares ilustrados, no rostros reales, para
  evitar cualquier problema de derechos de imagen en la memoria del TFM) subidas una vez al mismo
  bucket durante el seed.

## Semilla de datos sintéticos

- `qualities`: seed obligatorio con las 15 cualidades del catálogo (a validar antes de implementar).
- `seed-users.json`: 10 usuarios sintéticos (más que las "3–5 parejas" originales, porque ahora hacen
  falta candidatos suficientes en el pool para que el cálculo de pre-compatibilidad por cualidades
  tenga sentido) con: email, alias único, nombre, foto genérica, 5 cualidades elegidas y sus 36
  respuestas — curados manualmente u generados una vez offline con la propia IA, y **congelados** para
  tener resultados reproducibles en las capturas de la memoria, sin gastar cuota de API en cada reseed.
- Script `seed.ts` (usando `@supabase/supabase-js` con la `service_role` key): crea primero la cuenta de
  **Supabase Auth** de cada usuario sintético vía la Admin API (contraseña aleatoria, nunca comunicada,
  ya que estos usuarios no necesitan iniciar sesión), sube las fotos genéricas a Storage, e inserta
  `qualities`, `users` (perfil), `user_qualities`, `questionnaires` (`questionnaire_completed_at`
  seteado). La opción mencionada aquí de precalcular también algunas filas de
  `comparisons`/`comparison_question_results`/`comparison_aggregated_results` entre usuarios seed **no
  se implementó** (no estaba en `tasks.md`, sección 18, que solo pide qualities+perfiles+cuestionarios):
  cada usuario seed queda disponible como candidato para cualquier usuario real que complete su propio
  cuestionario (`candidate-selector.service.ts` ya lo cubre desde la sección 8), pero no hay
  comparaciones precalculadas entre los propios usuarios seed entre sí.
- **Cuenta de demostración sin perfil**: además de los 10 usuarios sintéticos completos, una cuenta de
  `auth.users` adicional (email/contraseña conocidos) sin fila en `users`, para mostrar en vivo durante
  la presentación el aterrizaje forzado en completar perfil paso 1 (`ProfileGuard`). Su contraseña
  **no se documenta en ningún fichero versionado** del repositorio.

## CI/CD y despliegue gratuito (ver `design.md` decisión 10 — sin Terraform)

**CI (GitHub Actions)**: `.github/workflows/ci.yml` corre en cada push/PR contra `main` — instala el
monorepo, ejecuta lint + test unitarios + build de `apps/backend` y `apps/frontend`, y un segundo step
que instala la Supabase CLI, levanta el stack local (`supabase start`) y corre `test:integration` contra
él antes de `supabase stop` (ver "Tests de integración" más abajo). La rama `main` exige este workflow
en verde para poder mergear — es la única puerta de calidad.

**CD, sin YAML de despliegue propio**: ni Vercel ni Render se despliegan *desde* Actions — cada uno usa
su integración Git nativa (preview por PR + producción al mergear a `main`), sin secretos de deploy en
GitHub.

**Terraform: descartado explícitamente** para este tamaño de proyecto (3 recursos, un solo entorno, sin
equipo) — aprovisionamiento manual documentado paso a paso en `docs/architecture.md`.

Pasos de aprovisionamiento manual:
1. **Supabase**: proyecto nuevo → ejecutar `0001_init.sql` → copiar `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`. Habilitar Auth (SMTP integrado, sin proveedor de email adicional).
2. **Backend en Render** (free tier, integración Git nativa): root `apps/backend`, build
   `npm install && npm run build`, start `node dist/main.js`. Variables de entorno (secretos de Render,
   nunca en el repo): `SUPABASE_*` (incluida `service_role`), `GROQ_API_KEY`, `OPENROUTER_API_KEY`
   (opcional), `CORS_ORIGIN`.
3. **Frontend en Vercel** (integración Git nativa, Root Directory = `apps/frontend` dentro del
   monorepo): build `ng build`, output `dist/frontend/browser`, variables `SUPABASE_URL` +
   `SUPABASE_ANON_KEY` (no son secretas) y la URL pública del backend en Render.
4. Documentar en `docs/architecture.md` el "cold start" del free tier de Render (~30–60s tras
   inactividad, mitigado con la pantalla de procesando/carga explicativa), la ausencia de Terraform y
   por qué, y dónde vive cada credencial (política de secretos) y cada log (solo Render, tail en vivo —
   ver "Logging estructurado" más abajo, se descartó un proveedor externo de persistencia).

## Riesgos y limitaciones (para la memoria del TFM)

- **Rate limits del free tier de Groq y cold-start de Render pueden afectar una demo en vivo** —
  confirmado real en la tarea 20.2: con varias comparaciones/lotes disparados seguidos (p. ej. dos
  cuestionarios completados en pocos minutos, o reintentar varias comparaciones `error` a la vez),
  Groq respondía `429` con facilidad. **Mitigado el 2026-08-19** tras reproducir el fallo real
  (2 de cada 3 comparaciones de un usuario nuevo en `error`) contra la API real de Groq: backoff
  entre reintentos realista (10s/25s, no los 50/150ms iniciales) y, sobre todo, analizar solo 6
  preguntas muestreadas por comparación en vez de las 36 completas — medido: las 3 comparaciones de
  un usuario nuevo caben ahora con margen en el presupuesto de 8.000 tokens/minuto del free tier
  (antes, una sola comparación ya lo agotaba). Riesgo reducido, no eliminado del todo: sigue siendo
  un free tier compartido. Si una comparación aun así quedara en `error`, usar el botón de
  reintentar (`POST /comparisons/:id/reanalyze`) en vez de repetir el cuestionario entero.
- El score de compatibilidad generado por un LLM **no tiene validez psicológica/clínica ni pretende
  dictaminar si dos personas podrían enamorarse**: el dashboard debe incluir un disclaimer explícito
  ("resultado orientativo, no sustituye asesoramiento
  profesional").
- Posibles sesgos del modelo (estereotipos culturales/de género); mitigable parcialmente vía prompt
  engineering, sin eliminarlo del todo.
- Las respuestas a las 36 preguntas son datos sensibles/íntimos: se siguen guardando las 36 en BD,
  pero desde 2026-08-19 solo se envían a la IA (proveedor externo) las 6 muestreadas por
  comparación, no las 36 — reduce, sin eliminar, cuánto dato sensible sale del propio backend;
  minimizar PII enviada y avisar al usuario en la interfaz sigue aplicando igual.
- Salida no determinista del LLM: la misma pareja de respuestas puede dar puntuaciones ligeramente
  distintas entre ejecuciones.
- **Fotos de usuario reales**: al ser un TFM con datos de prueba, conviene aclarar en la memoria que
  las fotos subidas por usuarios reales son datos personales sensibles (imagen) — documentar
  consentimiento informado y, si se hace una demo pública, usar solo cuentas de prueba propias en vez
  de invitar a subir fotos reales de terceros.
- **Guerra fría de candidatos**: si el pool de usuarios es pequeño, la pre-compatibilidad por
  cualidades puede devolver los mismos 2-3 candidatos para casi todos los usuarios nuevos; mitigado en
  v1 ampliando el seed a 10 perfiles variados.
- **Límite de envío de emails del free tier de Supabase Auth**: el SMTP incluido tiene un rate limit
  bajo para emails transaccionales (confirmación/recuperación de contraseña); suficiente para una demo
  con pocos usuarios de prueba, documentar como limitación conocida si se satura.
- **RLS mal configurada** podría exponer perfiles/cuestionarios de otros usuarios: mitigar con tests de
  integración específicos (contra el stack local de Supabase, ver más abajo) que verifiquen el
  aislamiento por usuario antes de dar la v1 por completa.
- **Aprovisionamiento manual (sin Terraform)** puede perderse si no se documenta bien: mitigado
  escribiendo los pasos exactos en `docs/architecture.md`, no solo en la memoria del desarrollador; al
  ser un único entorno no hay una segunda instancia con la que desincronizarse.
- **Sin histórico de logs buscable más allá de la sesión reciente de Render**: se evaluó un proveedor
  externo (Better Stack/Logtail) y se descartó en la tarea 19.1 por la fricción de su alta frente al
  beneficio real para el alcance de una demo de TFM — limitación aceptada sin mitigación técnica; el
  dashboard de Render sigue sirviendo para revisar un fallo reciente en vivo.
- **Los tests de integración exigen Docker Desktop en local** (Supabase CLI): solo afecta al ciclo de
  integración, no al de unitarios (TDD rápido); en CI no hace falta instalar nada porque los runners de
  GitHub Actions ya traen Docker.

**Fuera de alcance v1** (mencionar solo como líneas futuras): más idiomas, otros sets de preguntas,
login social/OAuth, verificación de email obligatoria antes de continuar el registro, panel de
analítica entre citas, permitir que el usuario elija manualmente más o menos de 3 candidatos, chat en
tiempo real vía WebSockets, llamadas de voz/vídeo, chats grupales, indicador de "escribiendo…",
edición/borrado de mensajes, notificaciones push y cifrado end-to-end del chat interno. El
recálculo retroactivo de candidatos para usuarios ya existentes queda explícitamente excluido por el
riesgo de coste de llamadas a la IA explicado arriba; si se retoma en el futuro, debería implementarse
como acción explícita bajo demanda del propio usuario ("buscar nuevos candidatos"), reutilizando
comparaciones ya calculadas entre el mismo par antes de volver a invocar al LLM, nunca como recálculo
automático en cadena.

## Propuesta de migración a producción (si la app saliera del marco de TFM)

Esta sección es explícitamente **fuera del alcance de la v1**, pero conviene incluirla en la memoria
como prueba de que la arquitectura se pensó con visión de escalabilidad, no solo para pasar el TFM. La
justificación de Clean Architecture de más arriba (interfaz de proveedor de IA, capa única de acceso a
datos, módulos desacoplados) es precisamente lo que hace que esta migración no requiera reescribir el
sistema, solo sustituir piezas concretas.

### LLM: de free tier a proveedor de pago

| Paso | Cambio | Beneficio |
|---|---|---|
| 1 (mínimo esfuerzo) | Pasar la misma cuenta de **Groq** a su plan de pago (pay-as-you-go) | Sube los límites de RPM/TPM y elimina el riesgo de cuota diaria agotada; **cero cambios de código** gracias a que `ai-provider.interface.ts` ya aísla el proveedor concreto. |
| 2 (mejor calidad de análisis) | Añadir un nuevo provider para **Anthropic Claude** (Haiku para coste, Sonnet para mayor calidad de razonamiento psicológico) implementando la misma interfaz | Mejor seguimiento de instrucciones complejas ("actúa como psicólogo, no inventes, justifica"), salida estructurada nativa (structured outputs/tool use) más fiable que forzar JSON por prompt, y soporte de **prompt caching** para no re-facturar el system prompt (la parte fija: rol de psicólogo + pesos + formato) en cada una de las 6 llamadas por comparación. |
| 3 (reducir nº de llamadas) | Con un modelo de mayor ventana de contexto y mejor fiabilidad de JSON, pasar de 6 batches de 6 preguntas a **1 sola llamada con las 36 preguntas** por comparación | De 18 a **3 llamadas por usuario nuevo** (una por candidato), menor latencia total y menor coste de overhead de prompt repetido. |
| 4 (opcional, a escala) | Usar la **Batch API** del proveedor (procesamiento asíncrono no en tiempo real) para los análisis | Descuentos habituales de ~50% frente a llamadas síncronas; encaja de forma natural porque el análisis ya es asíncrono en el diseño actual (pantalla de "procesando" + polling). |

**Corrección sobre el paso 3 (2026-08-19)**: medido contra la API real de Groq, una única llamada con
las **36** preguntas completas de una comparación costaría ~11.100 tokens — por encima del límite de
8.000 tokens/minuto del free tier ella sola, así que esa idea (tal como estaba escrita) no habría
resuelto el problema real de límite de tasa que sí motivó este apartado; solo reduce la latencia y el
overhead de repetir el system prompt, no el consumo total de tokens. Lo que sí funcionó, y ya está
implementado (no es solo un "camino de mejora" pendiente), es lo contrario: **reducir el número de
preguntas analizadas** (6 muestreadas por comparación, 1 por bloque, en una única llamada — ver
"Orquestación de las llamadas a IA" y `openspec/changes/archive/2026-08-19-sample-questions-per-block`),
no aumentar cuántas preguntas caben en cada llamada. El paso 3 seguiría siendo válido combinado con
el paso 1 (plan de pago, que sí sube el límite de tokens/minuto) o con un proveedor de mayor límite,
pero no como sustituto de ninguno de los dos.

### Despliegue: de free tier a infraestructura de producción

- **Backend**: pasar de Render free (con cold-start) a un plan de pago con always-on, o migrar el
  mismo contenedor NestJS a un servicio con autoscaling (Fly.io, AWS Fargate, Azure Container Apps —
  esta última especialmente natural dado el perfil de la usuaria en el ecosistema Microsoft).
- **Frontend**: Vercel/Netlify en plan Pro (más ancho de banda y builds), o servir el build estático de
  Angular desde un CDN dedicado.
- **Base de datos**: Supabase en plan Pro — backups automáticos, point-in-time recovery, más
  almacenamiento/conexiones concurrentes; alternativa: Azure Database for PostgreSQL, de nuevo por
  afinidad con el stack Microsoft ya conocido por la usuaria.
- **Fotos de usuario**: migrar de Supabase Storage free a **Cloudflare R2 o AWS S3 + CDN**, más
  económico a escala para servir imágenes que un bucket incluido en el plan de base de datos.

### Otros aspectos a documentar como líneas de comercialización (mención breve)

- **Cumplimiento normativo (RGPD)**: las fotos y las respuestas a preguntas de intimidad emocional son
  datos personales sensibles; comercializar la app exigiría política de privacidad, base legal de
  tratamiento, acuerdo de encargado de tratamiento con el proveedor de IA elegido, y mecanismo de
  borrado de datos a petición del usuario.
- **Observabilidad más allá de logs**: el logging estructurado con Pino ya es parte de la v1 (ver
  decisión 8b) — sin persistencia externa en v1 (descartada en la tarea 19.1, ver Riesgos); si se
  retomara, un proveedor con transport de Pino (Axiom, Grafana Cloud, u otro) sería la vía natural. Lo
  que queda como línea futura es monitorización de errores dedicada (ej. Sentry) y de coste de IA
  (tokens consumidos por análisis) para poder facturar/controlar el gasto en producción.
- **Login social/OAuth**: añadir Google/Apple/etc. sobre la autenticación por email/contraseña ya
  existente en v1, reduciendo fricción de alta si se comercializa.
- **Verificación de email obligatoria**: activar la confirmación por email de Supabase Auth (desactivada
  en v1 para simplificar la demo) antes de permitir el uso completo de una cuenta.
- **Modelo de negocio**: si se monetiza, integración de pasarela de pago (ej. Stripe) — fuera del
  alcance técnico de este documento, se menciona solo para que quede constancia en la memoria de que se
  ha considerado.

## Metodología de desarrollo: TDD + logging

La implementación debe seguir **TDD (test-driven development)** e insertar **logging estructurado**
de forma sistemática, con el objetivo explícito de evitar depuraciones largas cuando algo falle
(especialmente en la orquestación de llamadas a IA, que es la parte con más superficie de fallo:
red, rate limits, JSON mal formado, timeouts).

**TDD, por capa:**
- **Funciones puras de dominio** (`weighting.util.ts`, `candidate-selector.service.ts` en su parte de
  cálculo, validación del esquema Zod): test primero, sin mocks — dado que son puras, se testean con
  Jest usando tablas de casos (caso feliz, empate en `shared_qualities_count`, menos de 3 candidatos
  disponibles, dimensiones en los límites 1.00/10.00).
- **Servicios con dependencias externas** (`ai-orchestrator.service.ts`, `photo-upload.service.ts`,
  `supabase.service.ts`, `supabase-auth.guard.ts`): test primero contra una interfaz/mock (`AiProvider`,
  cliente de Supabase inyectado, JWT válido/inválido), cubriendo explícitamente los casos de error:
  respuesta no-JSON del LLM, respuesta JSON con claves faltantes o valores fuera de rango, timeout/429
  del proveedor, fallo de subida de foto, token ausente/expirado.
- **Tests de integración, sin escribir/borrar datos a mano** (ver `design.md` decisión 11): contra el
  stack local de Supabase (CLI + Docker, `supabase start`/`db reset`, nunca el proyecto real), con
  fixtures montadas por *factory* (`test/factories/`, usando el cliente `service_role`) y un pool fijo
  de cuentas `auth.users` creado una sola vez en `globalSetup` — un `afterEach` compartido hace
  `TRUNCATE ... CASCADE` sobre las tablas de dominio entre tests. El test de **aislamiento por usuario
  (RLS)** que confirma que un usuario autenticado no puede leer ni escribir la fila de
  `users`/`questionnaires` de otro usuario se autentica con el JWT real de una cuenta del pool
  (`signInWithPassword`), no con `service_role`, para ejercitar `auth.uid()` de verdad. Separados de los
  unitarios en scripts npm distintos (`test` vs `test:integration`) para que el ciclo rápido de TDD no
  dependa de tener Docker levantado.
- **Controllers/endpoints**: tests e2e de NestJS (`supertest`) escritos antes de implementar cada
  endpoint, cubriendo el contrato descrito en "Endpoints backend clave" (código 201/200 esperado,
  forma del body de respuesta, errores 4xx cuando el payload no cumple el DTO).
- **Frontend**: tests de componente (Angular Testing Library o TestBed) para las validaciones de UI
  con más lógica (selección de exactamente 5 cualidades con tope de marcado, wizard de 6 pasos del
  cuestionario con autoguardado de borrador y envío bloqueado hasta completar las 36 respuestas, polling
  que se detiene al llegar a `completed`, sondeo de mensajes de chat mientras la conversación está
  abierta), escritos antes del componente cuando la lógica no sea trivial de maquetación pura.
- Ciclo estricto rojo-verde-refactor por cada unidad de trabajo de `tasks.md`; no se marca una tarea
  como completada sin su test correspondiente en verde.

**Logging estructurado (ver `design.md` decisión 8b):**
- Logger único en el backend con **`nestjs-pino`** (JSON estructurado de fábrica, no un wrapper a mano)
  con niveles (`debug`/`log`/`warn`/`error`) y contexto por módulo (`AiOrchestratorService`,
  `CandidateSelectorService`, etc.), nunca `console.log` suelto.
- **Dónde se almacenan**: solo stdout, visible en el dashboard de Render para tail en vivo (retención
  corta en el free tier) — sin persistencia externa en v1: se evaluó un transport de Pino hacia Better
  Stack (Logtail) y se descartó al ejecutar la tarea 19.1 por la fricción de su alta (exigía elegir una
  integración adicional ajena al proyecto, sin poder omitirla), priorizando no depender de un proveedor
  externo más. Limitación aceptada, documentada en Riesgos.
- Puntos de log obligatorios en el flujo crítico (orquestación IA): al enviar cada batch (comparisonId,
  questionIds del batch, proveedor, intento nº), al recibir respuesta (duración, tokens si el proveedor
  los expone), al fallar validación Zod (payload crudo recibido, motivo de fallo) y en cada
  reintento/backoff (intento nº, causa).
- Los mismos identificadores (`comparison_id`, `user_id`, `match`/`batch index`) deben propagarse en
  todos los logs de una misma operación para poder reconstruir el flujo completo de un fallo con un
  solo `grep`/filtro, sin tener que cruzar logs de distintos servicios a ciegas.
- Nunca loguear el contenido íntegro de las 36 respuestas de un usuario en texto plano en producción
  (dato sensible) — loguear longitudes, IDs y metadatos, no el contenido libre de las respuestas.

## Archivos críticos a crear

- `package.json` (raíz, workspaces)
- `.github/workflows/ci.yml` (lint + test + test:e2e + build, y `test:integration` contra el stack
  local de Supabase — ver decisión 10/11)
- `packages/shared-types/src/{answer-set,comparison-result,aggregated-result,quality,user-profile,conversation,message}.ts`
- `supabase/migrations/0001_init.sql` (incluye `users` con FK a `auth.users`, `alias` único,
  `qualities`, `user_qualities`, `comparisons`, `conversations`, `messages`, políticas RLS, etc.)
- `apps/backend/src/auth/supabase-auth.guard.ts`
- `apps/backend/src/questionnaires/commands/complete-questionnaire.command.ts` (+ handler y evento)
- `apps/backend/src/matching/candidate-selector.service.ts` y sus handlers de
  `QuestionnaireCompletedEvent` y de `RecalculateCompatibilityCommand`
- `apps/backend/src/users/photo-upload.service.ts`
- `apps/backend/src/ai/ai-orchestrator.service.ts`, `apps/backend/src/ai/prompts/compatibility-prompt.ts`,
  `apps/backend/src/ai/commands/analyze-comparison.command.ts` y su handler de
  `ComparisonsCreatedEvent`
- `apps/backend/src/comparisons/weighting.util.ts`
- `apps/backend/src/chat/chat.controller.ts`, `apps/backend/src/chat/chat.service.ts`
- `test/setup/global-setup.ts` (pool de cuentas `auth.users`), `test/setup/reset-domain-tables.ts`
  (`TRUNCATE ... CASCADE` compartido) y `test/factories/` (`createTestUser`, `createTestQuestionnaire`,
  `createComparison`, ...) — infraestructura de tests de integración, decisión 11
- `apps/frontend/src/app/features/landing/landing.component.ts` (pantalla pública en `/`)
- `apps/frontend/src/app/features/auth/` (login, registro paso 1, forgot/reset password — fondo
  degradado, Shell B)
- `apps/frontend/src/app/features/registration/registration.component.ts` (wizard de 2 pasos)
- `apps/frontend/src/app/features/settings/settings.component.ts`
- `apps/frontend/src/app/features/results-dashboard/results-dashboard.component.ts`
- `apps/frontend/src/app/features/chats/chats.component.ts` (listado) y
  `apps/frontend/src/app/features/chats/chat-conversation.component.ts` (conversación)
- `supabase/seed/seed-users.json`, `supabase/seed/seed.ts` (incluye la cuenta de demostración sin
  perfil, ver "Semilla de datos sintéticos")

## Verificación

1. `npm install` en la raíz del monorepo levanta todos los workspaces sin errores; `npm test` (unitarios)
   pasa sin depender de Docker; `npm run test:integration` pasa contra el stack local de Supabase
   (`supabase start`).
2. Ejecutar el script de seed contra el proyecto Supabase: confirmar en el SQL Editor que existen las
   cuentas de `auth.users` de los perfiles sintéticos y de la cuenta de demostración (sin fila en
   `users`), y que `qualities`, `users` (con `alias`, `photo_url`), `user_qualities` y `questionnaires`
   quedan pobladas con los 10 perfiles completos.
3. Backend: `npm run start:dev` en `apps/backend`, probar con Postman/cURL el flujo completo de un
   usuario nuevo autenticado: `POST /users/me/profile` (con alias y foto) →
   `POST /users/me/questionnaire` → comprobar que se crean 3 filas en `comparisons` con los candidatos
   de mayor `shared_qualities_count` respecto al seed → `GET /users/me/comparisons` hasta `completed` →
   verificar a mano el cálculo ponderado compuesto (bloques 5/5/15/20/25/30% dentro de cada dimensión,
   combinados con los pesos de dimensión 20/25/10/25/10/10) de al menos una comparación contra datos de
   prueba conocidos. Confirmar también que las peticiones sin JWT válido son rechazadas.
4. Frontend: `ng serve` en `apps/frontend`, recorrer el flujo end-to-end contra el backend local:
   landing → registro paso 1 (email/contraseña) → completar perfil paso 2a (foto, nombre, alias) → paso
   2b (5 cualidades como píldoras) → bienvenida del cuestionario → wizard de 6 bloques (una pregunta a
   pantalla completa, navegación por puntos) → procesando → dashboard (foto, alias y radar chart
   correctos, ordenado por `compatibilidad_final`) → configuración (editar perfil, "Editar tus
   respuestas" del cuestionario, contraseña) → logout → login → recuperar contraseña. Además, iniciar
   sesión con la cuenta de demostración sin perfil e intentar navegar por URL a `/dashboard`,
   `/settings`, `/chats`, comprobando que siempre redirige a completar perfil paso 1.
5. Recorrer el flujo de edición y recálculo: recargar la app tras completar el cuestionario y comprobar
   que la página principal es el dashboard; editar solo cualidades desde configuración y usar el atajo
   "Recalcular compatibilidad ahora"; por separado, entrar a "Editar tus respuestas", editar el
   cuestionario y comprobar que "Guardar y recalcular compatibilidad" recalcula sin pasos intermedios;
   verificar en ambos casos que el dashboard se refresca con nuevas comparaciones, y que las
   comparaciones de otros usuarios (seed) que lo tuvieran como candidato no se ven afectadas.
5b. Recorrer el flujo de chat con dos cuentas de prueba: usuario A pulsa "Chatear" en la tarjeta de un
   candidato B en su dashboard; comprobar que B ve la conversación desde el icono del menú aunque A no
   aparezca entre sus propios candidatos; enviar mensajes en ambos sentidos y comprobar que llegan por
   sondeo sin recargar; recalcular la compatibilidad de A y comprobar que la conversación con B sigue
   existiendo aunque B deje de ser su candidato.
6. Verificar el responsive en 3 anchos de viewport (móvil ~375px, tablet ~768px, escritorio ~1280px)
   sobre todas las pantallas (incluida la landing): cabecera colapsada en móvil, sin scroll horizontal
   en formularios/cuestionario/chat, tarjetas del dashboard apiladas en móvil y radar chart sin
   desbordar.
7. Confirmar que el workflow de GitHub Actions (`ci.yml`) pasa en verde en un PR de prueba (lint + test +
   test:e2e + build + `test:integration`) antes de mergear a `main`, y que Vercel/Render despliegan
   automáticamente al mergear (sin ningún paso manual ni job de Actions disparando el deploy).
8. Desplegar en Render + Vercel + Supabase (free tier, incluyendo Auth, Storage y RLS) y repetir el flujo
   completo desde las URLs públicas para validar CORS, subida de fotos, variables de entorno, el
   cold-start de Render y que los logs llegan a Render (tail en vivo — único destino en v1, ver
   "Logging estructurado").
