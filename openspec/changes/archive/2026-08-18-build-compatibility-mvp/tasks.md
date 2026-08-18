## 1. Scaffold del monorepo

- [x] 1.1 Crear `package.json` raíz con npm workspaces (`apps/*`, `packages/*`) y scripts comunes
      (lint, test, build) para todo el monorepo
- [x] 1.2 Scaffolding de `apps/backend` con NestJS CLI (estructura de módulos, Jest configurado)
- [x] 1.3 Scaffolding de `apps/frontend` con Angular CLI (routing, testing con Karma/Jasmine o
      Angular Testing Library configurado), añadiendo `@supabase/supabase-js` como dependencia para el
      cliente de autenticación
- [x] 1.6 Instalar `bootstrap`, `bootstrap-icons` y `@ng-bootstrap/ng-bootstrap` en `apps/frontend`, y
      configurar `apps/frontend/src/styles.scss` para compilar Bootstrap desde su fuente Sass con los
      tokens de `.claude/skills/ui-design-consistency/references/design-tokens.md`
      (`$primary: #FB8500`, `$secondary: #BE1E2D`, `$dark: #000000`, `$light: #FDF0D5`,
      `$font-family-base` con Poppins) sobrescritos antes del `@import`, en vez de usar el CSS
      precompilado de Bootstrap sin tokenizar
- [x] 1.4 Configurar linters/formatters compartidos (ESLint + Prettier) para backend y frontend
- [x] 1.5 Configurar `nestjs-pino` como logger estructurado único del backend (ver `design.md` decisión
      8b — JSON estructurado de fábrica, con contexto por módulo) reutilizable desde cualquier servicio,
      sin `console.log` sueltos
- [x] 1.5b Test: con `LOGTAIL_SOURCE_TOKEN` definido en el entorno, el logger añade el transport hacia
      Better Stack (Logtail) además de stdout; sin esa variable definida (caso de tests/local), el
      logger solo escribe a stdout, sin fallar ni intentar conectar a Logtail
- [x] 1.5c Implementar el transport condicional de la tarea anterior, y documentar
      `LOGTAIL_SOURCE_TOKEN` (solo el nombre, nunca el valor) en `apps/backend/.env.example`

      **Revisado en la tarea 19.1** (sección 19): el alta en Better Stack exigía elegir una integración
      adicional ajena al proyecto (AWS/GCP/Azure/Slack/Teams/PagerDuty) sin poder omitirla — fricción
      desproporcionada frente al beneficio, así que se descartó el proveedor externo (ver `design.md`
      decisión 8b, revisada). El transport condicional a Logtail de 1.5b/1.5c se retiró:
      `pino-transport.config.ts` y su test se eliminaron, `logger.module.ts` configura ahora un único
      target fijo a stdout, `@logtail/pino` se quitó de `apps/backend/package.json` y
      `LOGTAIL_SOURCE_TOKEN` de `.env.example`. Estas dos tareas quedan `[x]` como registro histórico de
      lo que se implementó y probó en su momento (funcionaba correctamente), no como descripción del
      estado actual.
- [x] 1.7 Instalar `@nestjs/cqrs` en `apps/backend` para el uso selectivo de Commands/Events descrito
      en el diseño (no para las lecturas simples)
- [x] 1.8 Test unitario: el interceptor de logging enganchado al `CommandBus` registra inicio, fin y
      resultado de cualquier Command despachado (incluyendo el caso de que el handler lance error), con
      un identificador de correlación propagado
- [x] 1.9 Implementar el interceptor de logging del `CommandBus` para que pase el test anterior,
      reemplazando la necesidad de logging manual repetido en cada Command Handler
- [x] 1.10 Crear `.github/workflows/ci.yml` (ver `design.md` decisión 10): en cada push/PR contra `main`,
      instala dependencias del monorepo y ejecuta lint + test (unitarios) + build de `apps/backend` y
      `apps/frontend`, y un segundo step que instala la Supabase CLI, ejecuta `supabase start` y corre
      `test:integration` contra ese stack local (decisión 11) antes de terminar con `supabase stop`. No
      despliega nada ni usa secrets de Vercel/Render/Supabase — es solo la puerta de calidad; el
      despliegue lo dispara la integración nativa de cada plataforma (tarea 19.2/19.3)
- [x] 1.11 Configurar la protección de la rama `main` en GitHub para exigir que el workflow de la tarea
      anterior pase en verde antes de poder mergear — requirió pasar el repositorio a público (plan
      gratuito de GitHub no permite branch protection en repos privados); configurada vía API con
      `required_status_checks.strict=true` sobre los dos checks de `ci.yml` ("Lint, unit tests y
      build" y "Tests de integración (stack local de Supabase)"), sin exigir revisión de PR (proyecto
      de un solo desarrollador) y sin permitir force-push ni borrado de `main`
- [x] 1.12 Instalar la Supabase CLI como dependencia de desarrollo y añadir los scripts npm `test`
      (unitarios, `*.spec.ts`, sin depender de Docker) y `test:integration` (`*.integration-spec.ts`,
      contra el stack local — ver `design.md` decisión 11) como comandos separados del monorepo
- [x] 1.13 Test de la propia infraestructura de test: un `globalSetup` de Jest crea un pool fijo de 3-4
      cuentas `auth.users` contra el stack local una sola vez al arrancar `test:integration` (no por
      test ni por archivo), y expone sus credenciales/JWT a los tests sin necesidad de recrearlas
- [x] 1.14 Implementar `test/setup/global-setup.ts` (pool de cuentas) y
      `test/setup/reset-domain-tables.ts` (helper de `afterEach` compartido que hace
      `TRUNCATE ... CASCADE` sobre las tablas de dominio, nunca sobre `auth.users`) para que pase el
      test anterior, y `test/factories/` (`createTestUser`, `createTestQuestionnaire`,
      `createComparison`, ...) con el cliente `service_role` para montar fixtures por test sin
      inserciones manuales repetidas

## 2. `packages/shared-types` (contrato compartido)

- [x] 2.1 Test: validar con datos de ejemplo que `AnswerSet` acepta exactamente 36 elementos con
      `{questionId, question, answer}` y rechaza formas inválidas (usando un validador Zod expuesto
      junto al tipo)
- [x] 2.2 Definir `answer-set.ts` (interfaz `AnswerSet` + esquema Zod de validación) para que pase el
      test anterior
- [x] 2.3 Test: validar el esquema de `ComparisonResult` (claves exactas del JSON pedido, rangos
      1.00–10.00 en los campos numéricos) con casos válidos e inválidos
- [x] 2.4 Definir `comparison-result.ts` (interfaz + esquema Zod) para que pase el test anterior
- [x] 2.5 Definir `aggregated-result.ts` (interfaz `AggregatedResult` con las 6 dimensiones, el
      `compatibilidad_final` y `weights: { dimension, block }` con ambos vectores de pesos usados) y
      `quality.ts` (interfaz `Quality`)
- [x] 2.6 Definir `questions.ts` con las 36 preguntas del cuestionario de compatibilidad (id, texto,
      categoría)
- [x] 2.7 Definir `user-profile.ts` (interfaz `UserProfile`: id, name, alias, photoUrl,
      questionnaireCompletedAt) compartida entre backend y frontend
- [x] 2.8 Definir `conversation.ts` (interfaz `Conversation`: id, otherParticipant `UserProfile`,
      lastMessage, unreadCount) y `message.ts` (interfaz `Message`: id, conversationId, senderId, body,
      createdAt, readAt) compartidas entre backend y frontend

## 3. Base de datos y autenticación (Supabase)

- [x] 3.1 Habilitar Supabase Auth (email/contraseña) en el proyecto y configurar la plantilla del email
      de recuperación de contraseña
- [x] 3.2 Escribir `supabase/migrations/0001_init.sql` con las tablas `qualities`, `user_qualities`,
      `questionnaires`, `comparisons` (con `on delete cascade` hacia sus resultados por pregunta y
      agregado, para soportar el recálculo), `comparison_question_results`,
      `comparison_aggregated_results`, `conversations` (`user_a_id`/`user_b_id` FK `users.id`
      normalizados `least`/`greatest`, `UNIQUE(user_a_id, user_b_id)`, sin FK a `comparisons`), `messages`
      (`conversation_id` FK, `sender_id` FK `users.id`, `body` no vacío, `read_at` nullable), y la tabla
      de perfil `users` (`id` FK a `auth.users.id`, `name`, `alias` con restricción `UNIQUE`,
      `photo_url`, `questionnaire_completed_at`, `needs_recalculation boolean not null default false`) e
      índices descritos en el diseño
- [x] 3.3 Test de integración (stack local de Supabase, decisión 11): autenticando el cliente de test
      con el JWT real de una cuenta del pool (`signInWithPassword`, no `service_role`), con RLS
      activada, un usuario autenticado no puede leer ni escribir la fila de `users`/`questionnaires` de
      otro usuario a través del cliente directo de Supabase, ni leer ni escribir en una
      `conversation`/`message` de la que no es `user_a_id`/`user_b_id`
- [x] 3.4 Escribir las políticas RLS de `users`, `user_qualities`, `questionnaires`, `conversations` y
      `messages` (`auth.uid() = id`/`user_id`/`user_a_id`/`user_b_id`/`sender_id` según corresponda,
      para lectura y escritura propia) para que pase el test anterior
- [x] 3.5 Crear el bucket público `user-photos` en Supabase Storage y documentar su configuración en
      `docs/architecture.md`
- [x] 3.6 Implementar `apps/backend/src/supabase/supabase.service.ts` como única puerta de acceso a
      datos con la `service_role` key (para operaciones cross-usuario como el matching), sin exponer
      detalles de Postgres al resto de servicios

## 4. Backend: módulo `auth`

- [x] 4.1 Test unitario: `SupabaseAuthGuard` acepta una request con un JWT de Supabase válido y
      rechaza una sin token o con token inválido/expirado
- [x] 4.2 Implementar `auth/supabase-auth.guard.ts` para que pase el test anterior, aplicándolo a los
      endpoints protegidos de perfil, cuestionario y comparaciones
- [x] 4.3 Test e2e: `GET /users/check-alias?alias=...` devuelve disponible/no disponible según exista
      ya el alias en BD (excluyendo el propio usuario si está autenticado)
- [x] 4.4 Implementar el endpoint de comprobación de alias para que pase el test anterior

## 5. Backend: módulo `qualities`

- [x] 5.1 Test e2e: `GET /qualities` devuelve las 15 cualidades del catálogo
- [x] 5.2 Implementar `qualities.controller.ts` y `qualities.service.ts` para que pase el test anterior

## 6. Backend: módulo `users` (perfil)

- [x] 6.1 Test unitario: `photo-upload.service.ts` sube archivos jpg/png/webp ≤2MB y rechaza formato o
      tamaño inválido (contra un cliente de Storage mockeado)
- [x] 6.2 Implementar `photo-upload.service.ts` para que pase el test anterior, incluyendo logging del
      resultado de la subida (éxito/fallo, `user_id` si ya existe, sin loguear el binario)
- [x] 6.3 Test e2e: `POST /users/me/profile` (tras autenticarse) crea el perfil con nombre, alias único
      y exactamente 5 cualidades válidas, devolviendo 201; rechaza con 4xx si el alias ya existe, hay
      ≠5 cualidades, foto inválida, campos faltantes, o no hay sesión autenticada
- [x] 6.4 Implementar `CreateUserProfileCommand` y su `CommandHandler` (invocado desde
      `users.controller.ts` en `POST /users/me/profile`), con DTOs de validación y el manejo de la
      violación de la restricción `UNIQUE` de alias como condición de carrera, para que pasen los tests
      anteriores
- [x] 6.5 Test e2e: `GET /users/me` devuelve el perfil del usuario autenticado (incluyendo
      `needs_recalculation`); `PATCH /users/me` actualiza nombre/alias/foto/cualidades con las mismas
      validaciones que la creación, y marca `needs_recalculation = true` únicamente cuando la selección
      de cualidades enviada difiere de la almacenada
- [x] 6.6 Implementar los endpoints de consulta/edición de perfil para que pasen los tests anteriores

## 7. Backend: módulo `questionnaires`

- [x] 7.1 Test unitario: rechazo de cuestionarios con menos de 36 respuestas, preguntas duplicadas o
      usuario que ya tiene cuestionario guardado
- [x] 7.2 Test e2e: `POST /users/me/questionnaire` (autenticado) con las 36 respuestas guarda el
      cuestionario y devuelve 200/201
- [x] 7.3 Test unitario: `CompleteQuestionnaireCommandHandler` persiste el cuestionario y publica
      `QuestionnaireCompletedEvent` con el `user_id`, sin invocar directamente ningún servicio del
      módulo `matching`
- [x] 7.4 Implementar `questionnaires.controller.ts` y `CompleteQuestionnaireCommand`/Handler
      (publicando `QuestionnaireCompletedEvent` al terminar) para que pasen los tests anteriores
- [x] 7.5 Test e2e: `PATCH /users/me/questionnaire` (autenticado, con cuestionario ya existente)
      sustituye las 36 respuestas y marca `needs_recalculation = true`; rechaza con 4xx si no hay
      cuestionario previo o si el envío está incompleto
- [x] 7.6 Implementar el endpoint de edición del cuestionario para que pase el test anterior
- [x] 7.7 Test e2e: `PUT /users/me/questionnaire/draft` (autenticado) acepta entre 0 y 35 respuestas sin
      exigir el conjunto completo, no marca `questionnaire_completed_at` y no dispara
      `QuestionnaireCompletedEvent`; `GET /users/me/questionnaire` devuelve las respuestas guardadas
      hasta el momento (parciales o completas)
- [x] 7.8 Implementar `questionnaires.service.ts` (servicio normal, sin Command) con los endpoints de
      guardado y lectura de borrador para que pasen los tests anteriores
- [x] 7.9 Test de integración (stack local de Supabase, decisión 11): el `upsert` de `writable-table.ts`
      usado por `saveDraft`/`CompleteQuestionnaireHandler` (tareas 7.4/7.8) funciona de verdad contra
      PostgREST/Postgres real, no solo contra los fakes en memoria de 7.2/7.3/7.7 — en concreto, que
      completar el cuestionario sobre un borrador ya guardado actualiza la fila existente en vez de
      chocar con `UNIQUE(user_id)`, y que un segundo guardado de borrador sobrescribe el primero sin
      duplicar fila. Añadido `test/integration/questionnaires.integration-spec.ts`; verificado en
      verde (16/16, junto al resto de la suite de integración) contra el stack local real

## 8. Backend: módulo `matching` (selección de candidatos)

- [x] 8.1 Test unitario de `candidate-selector.service.ts` con tabla de casos: 3+ candidatos
      disponibles, empate en cualidades coincidentes (desempate por antigüedad), 1-2 candidatos
      disponibles, 0 candidatos disponibles
- [x] 8.2 Implementar `candidate-selector.service.ts` (consulta de pre-compatibilidad + creación de
      filas `comparisons` en estado `pending`) para que pasen los tests anteriores, con logging del
      resultado de la selección (`user_id`, candidatos elegidos, `shared_qualities_count`)
- [x] 8.3 Test unitario/integración: al completar un usuario nuevo su cuestionario, verificar que NO se
      generan ni modifican comparaciones de usuarios ya existentes (regla de cálculo único)
- [x] 8.4 Test unitario: el handler de `QuestionnaireCompletedEvent` en `matching` invoca a
      `candidate-selector.service.ts` con el `user_id` del evento y, si se crean una o más filas
      `comparisons`, publica `ComparisonsCreatedEvent` con la lista de `comparison_id` creados (y no
      publica nada si no hay candidatos disponibles)
- [x] 8.5 Implementar el handler de `QuestionnaireCompletedEvent` y la publicación de
      `ComparisonsCreatedEvent` para que pase el test anterior
- [x] 8.6 Test unitario: `RecalculateCompatibilityCommandHandler` solo actúa si
      `users.needs_recalculation = true` (rechaza en caso contrario), reutiliza
      `candidate-selector.service.ts`, elimina las comparaciones anteriores del usuario, publica
      `ComparisonsCreatedEvent` con las nuevas, y desmarca `needs_recalculation`
- [x] 8.7 Implementar `RecalculateCompatibilityCommand`/Handler para que pase el test anterior
- [x] 8.8 Test e2e: `POST /users/me/recalculate` (autenticado) despacha `RecalculateCompatibilityCommand`
      y devuelve 200/201 si `needs_recalculation` era `true`, o 4xx si no había nada pendiente de
      recalcular
- [x] 8.9 Implementar el endpoint de recálculo para que pase el test anterior

## 9. Backend: módulo `ai` (orquestación de IA)

- [x] 9.1 Definir `ai-provider.interface.ts` (contrato común para cualquier proveedor de IA)
- [x] 9.2 Test unitario de `groq.provider.ts` contra un cliente HTTP mockeado: éxito, error de red,
      respuesta 429/rate-limit
- [x] 9.3 Implementar `groq.provider.ts` para que pase el test anterior, con logging de cada llamada
      (proveedor, duración, resultado) sin incluir el contenido de las respuestas de usuario
- [x] 9.4 Implementar `openrouter.provider.ts` siguiendo la misma interfaz y los mismos criterios de
      test/logging que `groq.provider.ts`
- [x] 9.5 Escribir `prompts/compatibility-prompt.ts` con el prompt de "psicólogo especializado en
      relaciones" y el formato de salida JSON esperado (array de resultados por pregunta)
- [x] 9.6 Test unitario de `schemas/comparison-result.schema.ts` (Zod): acepta un array válido de
      resultados, rechaza claves faltantes, valores fuera de 1.00–10.00 o con más de 2 decimales
- [x] 9.7 Implementar el esquema Zod para que pase el test anterior
- [x] 9.8 Test unitario de `ai-orchestrator.service.ts`: agrupa 36 preguntas en 6 lotes de 6, valida
      cada respuesta, reintenta hasta 3 veces con backoff ante respuesta inválida, marca `error` tras
      fallo persistente, y respeta el límite de 2 lotes concurrentes por comparación
- [x] 9.9 Implementar `ai-orchestrator.service.ts` para que pase el test anterior, instrumentando log
      de envío/recepción/reintento de cada lote con `comparison_id` y `question_ids` propagados, sin
      loguear el contenido íntegro de las respuestas
- [x] 9.10 Test unitario: el handler de `ComparisonsCreatedEvent` en `ai` dispara
      `ai-orchestrator.service.ts` para cada `comparison_id` recibido en el evento, sin que `matching`
      conozca la existencia del módulo `ai`
- [x] 9.11 Implementar el handler de `ComparisonsCreatedEvent` para que pase el test anterior
- [x] 9.12 Test e2e: `POST /comparisons/:id/reanalyze` sobre una comparación en `error` despacha
      `AnalyzeComparisonCommand` y repite el análisis desde cero
- [x] 9.13 Implementar `AnalyzeComparisonCommand`/Handler (invocado desde el endpoint de reintento
      manual y reutilizado por el handler de `ComparisonsCreatedEvent`) para que pase el test anterior
- [x] 9.14 Test de integración (stack local de Supabase, decisión 11): el insert en bloque de las 36
      filas de `comparison_question_results` (`.insert([...]).select('id')`, sin `.single()`, nuevo
      en `writable-table.ts`) y los `.delete()` nuevos sobre esa tabla y
      `comparison_aggregated_results` funcionan de verdad contra PostgREST/Postgres real, no solo
      contra los fakes en memoria de 9.8 — en concreto, que reanalizar borra de verdad los
      resultados/agregado anteriores en vez de acumularlos (`UNIQUE(comparison_id)` en el agregado
      se satisface porque el borrado ocurre antes), y que un fallo persistente del proveedor de IA no
      deja ninguna fila nueva en BD real. Añadido
      `test/integration/ai-orchestrator.integration-spec.ts`; verificado en verde (19/19, junto al
      resto de la suite de integración) contra el stack local real

## 10. Backend: módulo `comparisons` (agregado ponderado + endpoints de consulta)

- [x] 10.1 Test unitario de `weighting.util.ts` (función pura) con tabla de casos: para cada dimensión,
       calcula la media ponderada de sus 6 bloques de preguntas (1–6, 7–12, ..., 31–36) con pesos
       5/5/15/20/25/30%, combina las 6 medias resultantes con los pesos por dimensión (20/25/10/25/
       10/10) para obtener `compatibilidad_final`, y redondea ambos a 2 decimales, sobre datos de
       prueba conocidos (incluyendo el caso de valores en los límites 1.00/10.00)
       — **adelantada durante la sección 9**: `ai-orchestrator.service.ts` necesita `weighting.util.ts`
       para poder dejar de verdad una comparación en `completed` (con su agregado persistido), así que
       se implementó ahí en vez de esperar a esta sección
- [x] 10.2 Implementar `weighting.util.ts` para que pase el test anterior, incluyendo el mapeo
       `questionId → índice de bloque (0–5)` y persistiendo ambos vectores de pesos en
       `weights: { dimension, block }` — en `apps/backend/src/comparisons/weighting.util.ts`
       (ver nota de 10.1)
- [x] 10.3 Test e2e: `GET /users/me/comparisons` devuelve estado y datos del candidato (alias, foto,
       `shared_qualities_count`) de cada comparación, y el resultado agregado cuando está disponible
- [x] 10.4 Test e2e: `GET /comparisons/:id/detail` devuelve el detalle de las 36 comparaciones por
       pregunta de una comparación completada (pregunta, puntuaciones por dimensión, `compatibilidad`,
       `explicación`), y **la respuesta no contiene en ningún campo** `respuesta_usuario_1` ni
       `respuesta_usuario_2`, aunque esos campos sí existan en el registro almacenado en BD
- [x] 10.5 Implementar `results.controller.ts`/`comparisons.controller.ts` y los servicios necesarios,
       incluyendo el mapeo que filtra `respuesta_usuario_1`/`respuesta_usuario_2` del DTO de salida antes
       de responder, para que pasen los tests anteriores — `GET /users/me/comparisons` vive en
       `my-comparisons.controller.ts` aparte (no cuelga del prefijo `comparisons/`), pero comparte
       `comparisons.service.ts`. Añadido de más, no pedido explícitamente por ninguna tarea pero
       exigido por la propia lógica de privacidad del proyecto: `GET /comparisons/:id/detail`
       comprueba que la comparación sea del usuario autenticado (404 igual si no existe o si no es
       suya, sin distinguir los dos casos) — `comparisons` no tiene RLS/GRANT a `authenticated`
       (decisión 3c), así que sin esta comprobación cualquier usuario podría leer el detalle de
       cualquier comparación ajena por id. Nuevos tipos compartidos `ComparisonSummary`/
       `ComparisonQuestionDetail` en `packages/shared-types` (no había tarea de sección 2 para
       ellos, igual que `user-profile.mapper.ts` en la sección 6 tampoco tuvo una tarea propia)

## 10b. Backend: módulo `chat` (conversaciones y mensajes)

Las tablas `conversations`/`messages` y sus políticas RLS ya se crean en la sección 3 (0001_init.sql);
esta sección es la lógica de negocio y los endpoints que se apoyan en ellas.

- [x] 10b.2 Test e2e: `POST /conversations` con un `candidateUserId` que sí aparece en las
       `comparisons` del usuario autenticado (como `requester_user_id`) crea la conversación y
       devuelve 201; si ya existía, devuelve la misma conversación sin duplicarla (idempotente)
- [x] 10b.3 Test e2e: `POST /conversations` con un `candidateUserId` que **no** aparece entre las
       `comparisons` del usuario autenticado como `requester_user_id` devuelve 4xx sin crear nada
- [x] 10b.4 Implementar `chat.controller.ts`/`chat.service.ts` para `POST /conversations`, validando la
       elegibilidad contra `comparisons` con `service_role` (igual que `matching`), para que pasen los
       tests anteriores
- [x] 10b.5 Test e2e: `GET /conversations` devuelve las conversaciones del usuario autenticado (sea
       `user_a_id` o `user_b_id`), con alias/foto del otro participante, el último mensaje y si hay no
       leídos, ordenadas por actividad más reciente primero
- [x] 10b.6 Test e2e: `GET /conversations/:id/messages` devuelve los mensajes de una conversación en
       orden cronológico y marca como leídos los mensajes dirigidos al usuario autenticado que estuvieran
       sin leer; devuelve 4xx si el usuario autenticado no es participante de esa conversación
- [x] 10b.7 Test e2e: `POST /conversations/:id/messages` con un `body` no vacío persiste el mensaje y lo
       devuelve; con `body` vacío devuelve 4xx sin persistir nada; con un usuario no participante de la
       conversación devuelve 4xx
- [x] 10b.8 Implementar los endpoints de los dos tests anteriores para que pasen, incluyendo el cálculo
       del contador de no leídos en `GET /conversations`

## 11. Frontend: shell de la aplicación autenticada

- [x] 11.1 Test de componente: la cabecera muestra los botones de chat, configuración y cerrar sesión
       solo cuando hay una sesión activa, en ese orden (chat a la izquierda de configuración), y el
       botón de cerrar sesión limpia la sesión y redirige a autenticación
- [x] 11.2 Implementar el layout/cabecera compartido (`core/shell` o similar) con los botones de chat,
       configuración y cerrar sesión (esquina superior derecha, en ese orden), para que pase el test
       anterior
- [x] 11.2b Test de componente: el icono de chat de la cabecera muestra un indicador visual cuando
       `GET /conversations` reporta al menos un mensaje sin leer en cualquier conversación, y deja de
       mostrarlo cuando no queda ninguno
- [x] 11.2c Implementar el sondeo del contador de no leídos (~20-30s) y el indicador en el icono de chat
       para que pase el test anterior
- [x] 11.3 Test de componente/routing: **con sesión activa**, la ruta principal (`/`) resuelve a
       completar perfil (paso 1) si `GET /users/me` indica que el usuario no tiene fila de perfil aún;
       si tiene perfil pero no ha completado nunca su cuestionario, resuelve al cuestionario; en caso
       contrario, al dashboard de resultados — en ese orden de prioridad
- [x] 11.4 Implementar el guard/resolver de enrutamiento de la página principal para que pase el test
       anterior
- [x] 11.5 Test de routing: un usuario autenticado sin perfil que intenta navegar directamente (por URL)
       a `/questionnaire`, `/dashboard`, `/settings` o `/chats` es redirigido a completar perfil (paso
       1) en vez de acceder a la ruta solicitada; un usuario con perfil ya completado no sufre esa
       redirección (ver spec `user-registration`, "Sin perfil, cualquier ruta redirige...")
- [x] 11.6 Implementar `ProfileGuard` (guard de ruta de Angular aplicado a todas las rutas autenticadas
       salvo `features/registration`) para que pase el test anterior, reutilizando la misma consulta a
       `GET /users/me` que el resolver de la tarea 11.4 (sin duplicar la llamada por cada guard)

## 11d. Frontend: landing pública (ver `design.md` decisión 3g)

- [x] 11d.1 Test de componente/routing: **sin sesión activa**, la ruta principal (`/`) muestra
       `features/landing` (titular, subtítulo explicando el producto, un único botón); **con sesión
       activa**, `/` no muestra la landing y resuelve igual que el test 11.3
- [x] 11d.2 Test de componente: el botón de la landing navega a `/auth/login`; con
       `prefers-reduced-motion: reduce` simulado, el titular/subtítulo/botón y el logo son visibles de
       inmediato sin depender de que termine ninguna animación
- [x] 11d.3 Implementar `features/landing` (fondo degradado reutilizado de Shell B, animación de entrada
       del logo + titular/subtítulo/botón, degradado de fondo con desplazamiento lento) y el guard de `/`
       que decide entre landing y la resolución autenticada, para que pasen los tests anteriores

## 12. Frontend: autenticación

- [x] 12.1 Test de componente: el formulario de login rechaza el envío con email/contraseña vacíos y
       muestra el error genérico de credenciales inválidas devuelto por el backend/Supabase
- [x] 12.2 Implementar `features/auth/login` (email + contraseña + enlace "¿olvidaste tu contraseña?")
       usando `supabase.auth.signInWithPassword`, para que pase el test anterior
- [x] 12.3 Test de componente: el formulario de registro (paso 1) valida formato de email y fortaleza
       mínima de contraseña antes de enviar, y muestra el error si el email ya existe
- [x] 12.4 Implementar `features/auth/register` (paso 1: email + contraseña) usando
       `supabase.auth.signUp`, redirigiendo al paso 2 (completar perfil) tras el alta, para que pase el
       test anterior
- [x] 12.5 Test de componente: el formulario de "olvidé mi contraseña" muestra siempre el mismo mensaje
       de confirmación, exista o no el email
- [x] 12.6 Implementar `features/auth/forgot-password` usando `supabase.auth.resetPasswordForEmail`
       para que pase el test anterior
- [x] 12.7 Implementar `features/auth/reset-password` (pantalla de destino del enlace del email) para
       establecer una nueva contraseña con `supabase.auth.updateUser`

## 13. Frontend: completar perfil (registro paso 2, wizard de 2 pasos — ver `design.md` decisión 3e)

- [x] 13.0 Test de componente: la pantalla se presenta en 2 pasos con paginación por puntos (2 puntos,
       el actual relleno) — paso 1 (foto + nombre completo + alias) y paso 2 (cualidades); el botón
       "Siguiente" del paso 1 solo avanza de paso (no llama a `POST /users/me/profile`) y permanece
       deshabilitado mientras foto/nombre/alias no sean válidos; el envío real ocurre solo al pulsar
       "Finalizar" en el paso 2, con los datos de ambos pasos juntos en una única llamada
- [x] 13.1 Test de componente: las 15 cualidades del paso 2 se muestran como píldoras (no cards); al
       llegar a 5 seleccionadas, las píldoras no marcadas quedan deshabilitadas (no se puede marcar una
       sexta) hasta que se desmarca alguna de las 5 — desmarcar siempre es posible; y "Finalizar"
       permanece deshabilitado mientras la selección no sea exactamente 5
- [x] 13.2 Test de componente (paso 1): el campo de alias valida en vivo contra `GET /users/check-alias`
       y muestra si está disponible u ocupado
- [x] 13.3 Test de componente: la cabecera de esta pantalla (Shell A) muestra el botón de cerrar sesión
       pero **no** el enlace de Configuración, a diferencia del resto de pantallas de Shell A
- [x] 13.4 Implementar `features/registration` como wizard de 2 pasos (estado local `currentStep`, sin
       llamada al backend entre pasos), con subida de foto con preview circular y validación de alias en
       el paso 1, y las píldoras de cualidad (`shared/quality-pill`) en el paso 2, para que pasen los
       tests anteriores, consumiendo `GET /qualities`, `GET /users/check-alias` y — solo al pulsar
       "Finalizar" — `POST /users/me/profile` con los campos de ambos pasos. **Gap real encontrado y
       arreglado durante la verificación en el navegador** (no una tarea propia de la sección, pero
       bloqueaba su comprobación end-to-end): `apps/backend/src/main.ts` nunca había llamado a
       `app.enableCors(...)` — primera vez que el frontend hace una llamada HTTP real al backend desde
       el navegador (11/11d/12 solo llamaban a Supabase Auth), así que el hueco llevaba ahí desde la
       sección 1 sin manifestarse. Sin CORS, el preflight `OPTIONS` de cualquier petición con
       `Authorization` o `multipart/form-data` respondía 404 y el navegador abortaba la petición real
       antes de enviarla — afectaba a `GET /users/check-alias`, `GET /qualities` (autenticada) y
       `POST /users/me/profile` por igual. Arreglado con `CORS_ORIGIN` (env var opcional, lista por
       comas, cae a `http://localhost:4200` sin definir) documentada en `.env.example`, para que la
       tarea 19.4 solo tenga que añadir la URL real de Vercel cuando exista

## 14. Frontend: cuestionario de 36 preguntas

- [x] 14.0 Test de componente: en **modo creación** (primera vez), antes del bloque 1 se muestra una
       pantalla de bienvenida (fondo degradado, título "Cuestionario de compatibilidad", botón
       "Iniciar") que da paso al wizard solo al pulsarla; en **modo edición** esta pantalla no aparece
       nunca — se entra directo al wizard ya prerellenado (ver `design.md` decisión 3h)
- [x] 14.1 Test de componente: las 36 preguntas se agrupan en 6 bloques presentados como un **wizard de
       6 pasos** — en cada momento solo se monta el bloque activo (nunca los 6 a la vez), con una flecha
       para volver al bloque anterior (o salir del cuestionario si es el bloque 1) y un botón para
       avanzar al siguiente sin exigir que el bloque actual esté completo
- [x] 14.2 Test de componente: encima del bloque activo se muestra una barra de progreso segmentada en 6
       tramos con ancho proporcional al peso del bloque (5/15/20/25/30, ver `design-tokens.md`), cada
       tramo relleno según la proporción de sus 6 preguntas respondidas — sin mostrar el porcentaje de
       peso como texto en ningún sitio — y los bloques 1 y 2 (mismo peso, 5%) reciben exactamente el
       mismo ancho/gradiente
- [x] 14.3 Test de componente: el `card-header` del bloque activo aplica la clase
       `question-block--weight-XX` según su peso (ver `design-tokens.md`), y un bloque ya completado
       (6/6) por el que ya se avanzó queda marcado con un check en su tramo de la barra de progreso
- [x] 14.3b Test de componente: hacer clic en el tramo de un bloque ya visitado (índice ≤ el bloque más
       avanzado alcanzado) navega directamente a revisarlo/editarlo sin pasar por los bloques
       intermedios; los tramos de bloques aún no alcanzados no son clicables. Al revisar un bloque
       anterior, el botón del `card-footer` cambia a "Volver a donde estabas" y, al pulsarlo, regresa al
       bloque más avanzado alcanzado (no simplemente al siguiente)
- [x] 14.4 Test de componente: al cargar la pantalla, se consulta `GET /users/me/questionnaire` y se
       prerellenan las respuestas ya guardadas (parciales o completas), posicionando el wizard en el
       primer bloque incompleto; cada respuesta se autoguarda contra `PUT /users/me/questionnaire/draft`
       (p. ej. al perder el foco o al cambiar de bloque), sin depender de `localStorage`
- [x] 14.5 Test de componente: el botón del bloque 6 muestra "Enviar cuestionario" en modo creación o
       "Guardar y recalcular compatibilidad" en modo edición, y permanece deshabilitado mientras no haya
       respuesta para las 36 preguntas; en los bloques 1-5 el botón "Siguiente bloque" nunca se
       deshabilita por respuestas pendientes
- [x] 14.5b Test de componente: en modo edición, pulsar el botón del bloque 6 encadena
       `PATCH /users/me/questionnaire` seguido de `POST /users/me/recalculate` (sin paso manual
       intermedio) y navega al dashboard al completarse ambas llamadas; en modo creación, pulsarlo llama
       solo a `POST /users/me/questionnaire` y navega a `features/processing`
- [x] 14.6 Test de componente: dentro del bloque activo, cada pregunta ocupa toda la pantalla (ya no
       pestañas `NgbNav`); debajo hay una fila de 6 puntos + flechas prev/next, cada punto relleno si su
       pregunta está respondida, clicable para saltar directo a ella solo si ya fue visitada
       (`currentQuestionIndex`/`maxReachedQuestionIndex`, alcance local al bloque activo), y cambiar de
       pregunta aplica la transición de `question-pane` salvo que el test simule
       `prefers-reduced-motion: reduce`, en cuyo caso el cambio de pregunta sigue funcionando sin
       animación
- [x] 14.7 Test de componente: el `textarea` de la pregunta activa ocupa el 100% del ancho de la card
       (no una columna estrecha) y tiene al menos `rows="4"` de alto
- [x] 14.8 Implementar `features/questionnaire` como wizard de 6 pasos (un bloque montado a la vez, con
       `currentBlockIndex`/`maxReachedBlockIndex` para poder revisar bloques anteriores sin perder el
       sitio donde ibas), con la pantalla de bienvenida previa en modo creación (tarea 14.0), la barra de
       progreso segmentada por peso y sus tramos clicables, la cabecera con flecha de volver, el
       `card-header` con el gradiente del bloque activo, la navegación de puntos + flechas entre las 6
       preguntas del bloque activo (con su propio `currentQuestionIndex`/`maxReachedQuestionIndex`) y su
       transición, el `textarea` a ancho completo y `rows="4"`, el autoguardado de borrador y el botón
       del bloque 6 (`btn-dark`) condicionado según el modo (tarea 14.5/14.5b), para que pasen los tests
       anteriores
- [x] 14.9 Diseñar `features/questionnaire` como componente reutilizable en modo "creación" (sin
       pantalla de bienvenida omitida, borrador + `POST /users/me/questionnaire` al final) y modo
       "edición" (sin pantalla de bienvenida, prerellenado, `PATCH /users/me/questionnaire` +
       `POST /users/me/recalculate` encadenados al final), accesible en modo edición como ruta propia
       (`/questionnaire?mode=edit`, no una vista embebida) desde el botón "Editar tus respuestas" de
       `features/settings`. **Dos gaps reales encontrados y arreglados durante la verificación en el
       navegador** (ninguno tarea propia de la sección, ambos invisibles para los 76 tests de Karma —
       cada test provee su propia tabla de rutas aislada, nunca ejercitan `app.routes.ts` real):
       (1) `packages/shared-types/src/index.ts` usaba `export * from './questions'` para el catálogo
       `QUESTIONS` — primer VALOR real (no un tipo) que el frontend importa de `shared-types`; el
       helper `__exportStar` que genera TypeScript para `export *` copia propiedades dinámicamente en
       tiempo de ejecución, un patrón que ni Node ni `ng build`/Karma (bundlers de un solo paso)
       tienen problema en resolver, pero que el dev server de Angular (`ng serve`, interop CJS→ESM
       nativo del navegador para paquetes de workspace enlazados por symlink) no puede analizar
       estáticamente — `SyntaxError: ... does not provide an export named 'QUESTIONS'`. Arreglado con
       una re-exportación nombrada explícita (`export { QUESTIONS, type Question } from
       './questions'`). (2) `/processing` nunca se había añadido a `app.routes.ts` (ni siquiera como
       `PlaceholderComponent`) — la sección 11 solo scaffoldeó las 5 rutas ya conocidas entonces
       (registration/questionnaire/dashboard/settings/chats); el botón "Enviar cuestionario" de esta
       sección es la primera cosa que navega de verdad a esa ruta, y sin ella `router.navigate(...)`
       lanza `NG04002: 'processing'`. Arreglada añadiendo la ruta placeholder que faltaba, y se añadió
       un test de regresión nuevo (`questionnaire.component.spec.ts`, describe "navegación contra la
       tabla de rutas real") que usa `app.routes` de verdad vía `RouterTestingHarness` en vez de una
       tabla de rutas aislada, precisamente para que este tipo de hueco no vuelva a pasar inadvertido

## 15. Frontend: pantalla de procesamiento (ver `design.md` decisión 3f)

- [x] 15.1 Test de componente: el polling se detiene al recibir todas las comparaciones en
       `completed`/`error` y navega al dashboard; mientras tanto muestra un spinner y una fila por cada
       candidato ya seleccionado con su icono de estado (pendiente/analizando, completado, error) — sin
       porcentaje agregado ni contador "N de 3"
- [x] 15.2 Implementar `features/processing` para que pase el test anterior, consultando
       `GET /users/me/comparisons`. `core/comparisons.service.ts` nuevo (se reutilizará en la sección
       16). Con 0 candidatos en el pool (nadie más ha completado el cuestionario todavía), la
       pantalla se queda sondeando indefinidamente con la lista vacía — caso límite no cubierto por
       ningún test explícito de esta sección ni resuelto con un timeout/mensaje aparte, aceptado
       conscientemente como residual de bajo riesgo (matching por afinidad de cualidades siempre
       puede dar 0 candidatos, ver design.md decisión 5); revisar si conviene cerrarlo en la sección
       20. Verificado en el navegador (usuario de prueba real, `POST /users/me/questionnaire` → 201 →
       `/processing` con spinner + lista vacía, sin errores de consola) — el camino de "candidatos
       resolviéndose y navegar al dashboard" solo se verificó con los 5 tests de Karma, no en vivo
       (habría exigido preparar 2+ usuarios con cuestionario completo de antemano para tener pool)

## 16. Frontend: dashboard de resultados

- [x] 16.1 Test de componente: las tarjetas de resultado se ordenan de mayor a menor
       `compatibilidad_final`, muestran el alias del candidato (no el nombre), y el detalle de las 36
       preguntas solo se muestra al expandir
- [x] 16.2 Test de componente: el detalle expandible de cada pregunta muestra el texto de la pregunta,
       sus puntuaciones por dimensión y la explicación de la IA, y **no renderiza en ningún elemento**
       el texto de la respuesta propia ni la del candidato, aunque el objeto recibido del backend
       llegara a incluirlos (defensa en profundidad además del filtrado en el backend)
- [x] 16.3 Implementar `features/results-dashboard` (tarjetas con foto/alias/score, radar chart con
       `ng2-charts`, detalle expandible sin respuestas) para que pasen los tests anteriores, consumiendo
       `GET /users/me/comparisons` y `GET /comparisons/:id/detail`
- [x] 16.4 Test de componente: el botón "recalcular compatibilidad" aparece deshabilitado/oculto cuando
       `needs_recalculation` es `false`, habilitado cuando es `true`, y tras pulsarlo y completarse el
       recálculo el dashboard se refresca con las nuevas tarjetas/gráficos
- [x] 16.5 Implementar el botón de recalcular compatibilidad en `features/results-dashboard` para que
       pase el test anterior, consumiendo `POST /users/me/recalculate` y refrescando `GET
       /users/me/comparisons` tras completarse
- [x] 16.6 Test de componente: cada tarjeta de resultado muestra un botón "Chatear" que, al pulsarlo,
       llama a `POST /conversations` con el candidato de esa tarjeta y navega a la conversación devuelta
- [x] 16.7 Implementar el botón "Chatear" en cada tarjeta de `features/results-dashboard` para que pase
       el test anterior. **Instalado `ng2-charts`/`chart.js`/`@angular/cdk`** (no eran dependencias
       hasta ahora) y registrados en `app.config.ts` (`provideCharts(withDefaultRegisterables())`) —
       necesario también en cada test de componente (`TestBed` no carga `app.config.ts`, así que sin
       repetir el provider en el propio spec, cualquier tarjeta `completed` lanza en Karma "radialLinear
       is not a registered scale"). **Presupuesto de bundle (`angular.json`) subido de 1MB a 1.5MB**
       de error — Chart.js por sí solo ya empuja el inicial a ~1.18MB; el warning en 500kB (ya aceptado
       desde secciones anteriores) se deja igual. Otros dos hallazgos reales, ninguno de la misma
       familia que los de la sección 14: (1) `{{ question.explicación }}` no compila — el lexer de
       expresiones de plantilla de Angular no admite tildes en notación de punto sobre identificadores
       (`Unexpected character [ó]`), aunque sea una propiedad TS válida; arreglado con notación de
       corchetes, `question['explicación']`. (2) `/chats/:id` no existía en `app.routes.ts` — añadida
       de forma preventiva esta vez (placeholder, `PlaceholderComponent`), antes de que la sección 17b
       la necesite de verdad, aplicando la lección de la sección 14 en vez de repetir el mismo
       redescubrimiento. Verificado de extremo a extremo en el navegador con dos usuarios de prueba
       reales y una comparación `completed` insertada a mano por SQL directamente en
       `comparisons`/`comparison_aggregated_results`/`comparison_question_results` (sin clave real de
       Groq no se puede llegar a `completed` por el pipeline real de IA) — confirmado que ni backend ni
       frontend exponen `respuesta_usuario_1`/`respuesta_usuario_2` aunque la fila de BD sí las
       tuviera, que el radar chart renderiza con los colores de marca, y que "Chatear" crea la
       conversación real y navega a `/chats/:id`. 88/88 tests + lint limpio + `ng build` limpio

## 17. Frontend: configuración de perfil

- [x] 17.1 Test de componente: el formulario de configuración prerellena los datos actuales y aplica
       las mismas reglas de cualidades (píldoras `shared/quality-pill`, tope de marcado en 5, bloqueo de
       envío si ≠5) y de alias (validación en vivo) que el registro — aquí sí en un único formulario, no
       en el wizard de 2 pasos de `features/registration`
- [x] 17.1b Test de componente: tras guardar cambios de perfil, si la respuesta indica
       `needsRecalculation = true`, aparece un aviso con un botón "Recalcular compatibilidad ahora" que
       llama a `POST /users/me/recalculate` y navega al dashboard; si no cambió la selección de
       cualidades, no aparece ningún aviso. **Matiz real encontrado escribiendo este test**:
       `UsersService.updateProfile` (backend, tarea 6.5/6.6) solo ESCRIBE `needs_recalculation = true`
       cuando las cualidades cambian, pero nunca lo resetea a `false` cuando no cambian (el `patch` de
       Postgres simplemente omite esa columna) — así que la respuesta de un guardado que NO tocó
       cualidades puede traer `needsRecalculation: true` heredado de un recálculo pendiente anterior y
       ajeno a ese guardado (p. ej. tras editar el cuestionario desde otra pantalla). El aviso de esta
       tarea se basa en si ESTE guardado cambió la selección (comparando contra las cualidades cargadas
       al entrar), no solo en el valor crudo de la respuesta — ver el comentario en
       `settings.component.ts`/`.spec.ts`. No se tocó el backend de la sección 6 para este matiz (fuera
       de alcance de esta sección; el frontend ya lo compensa correctamente)
- [x] 17.2 Implementar `features/settings` (edición de nombre/alias/foto/cualidades, con el aviso y
       botón de la tarea anterior) para que pasen los tests anteriores, consumiendo `GET /users/me`,
       `PATCH /users/me` y `POST /users/me/recalculate`. Añadido `UsersService.updateProfile()`
       (`UpdateProfilePayload`, foto opcional a diferencia de `createProfile`) — no había tarea propia
       de sección para él, igual que `createProfile` en la 13. **3 cards apiladas** en vez de una sola
       (perfil, contraseña, cuestionario — 3 acciones de guardado independientes): nuevo "caso especial"
       documentado en `page-template.md`
- [x] 17.3 Test de componente: el cambio de contraseña exige la contraseña actual y la reintenta contra
       Supabase antes de llamar a `updateUser`; si la contraseña actual es incorrecta, no se cambia
- [x] 17.4 Implementar la sección de cambio de contraseña dentro de `features/settings` para que pase
       el test anterior (design.md decisión 7b), reutilizando `AuthService.signInWithPassword`/
       `updatePassword` ya existentes (sección 12) — sin añadir ningún método nuevo a `AuthService`
- [x] 17.5 Test de componente: `features/settings` muestra un resumen del cuestionario (fecha de
       finalización) y un botón "Editar tus respuestas" que **navega** a `/questionnaire?mode=edit` (no
       despliega el wizard dentro de la propia pantalla de configuración)
- [x] 17.6 Implementar la sección de cuestionario de `features/settings` (resumen + navegación) para
       que pase el test anterior — el guardado en sí, y el recálculo encadenado, viven en
       `features/questionnaire` en modo edición (tareas 14.5/14.5b/14.9), no se duplican aquí.
       **Bug real encontrado y arreglado durante la verificación** (no una tarea propia de la sección,
       de la misma familia que los gaps de rutas de las secciones 14/16, pero a la inversa: aquí el
       problema lo causa una ruta que SÍ existía como placeholder y pasa a tener contenido real):
       al cablear `/settings` a `SettingsComponent` de verdad en `app.routes.ts`, la suite completa de
       Karma empezó a fallar de forma intermitente y a colgarse (Chrome Headless se desconectaba a los
       30s) — `profile.guard.spec.ts` (sección 11) navega por las 4 rutas protegidas usando
       `app.routes` real con un `UsersService` falso mínimo (`fakeUsersService`, solo
       `getOwnProfile`/`invalidateOwnProfile`, escrito en la sección 11 cuando `/settings` aún era un
       `PlaceholderComponent`); al montar de verdad `SettingsComponent`, su formulario engancha
       `aliasAvailableValidator` sobre ese mismo `UsersService` falso, y en cuanto se hace `patchValue`
       (carga inicial del perfil) el validador asíncrono llama a `usersService.checkAlias(...)`, que no
       existe en ese fake — `TypeError` real, pero lanzado dentro del mecanismo interno de señales que
       ejecuta validadores async (fuera del ciclo síncrono de creación del componente), así que escapa
       al manejo de errores del Router y descoloca al test runner en vez de fallar limpiamente el test
       que lo origina — de ahí el aspecto de "flake" (la posición del fallo variaba según el orden
       aleatorio de Jasmine). Aislado con bisección manual de `--include` hasta un repro mínimo de 2
       ficheros. Arreglado añadiendo `checkAlias`/`updateProfile` a `fakeUsersService`
       (`core/testing/fakes.ts`) y completando los providers de `profile.guard.spec.ts`/
       `main-route.guard.spec.ts` (`QuestionnaireService`/`ComparisonsService`/`QualitiesService`/
       `MatchingService`) para que cualquier componente real que esas rutas lleguen a montar en el
       futuro tenga lo que necesita, en vez de depender de que sus llamadas HTTP fallen en silencio.
       101/101 tests + lint limpio + `ng build` limpio tras el arreglo

## 17b. Frontend: chat interno

- [x] 17b.1 Test de componente: `features/chats` (listado) muestra una fila por conversación con
       foto/alias del otro participante, el último mensaje y su fecha, ordenadas por actividad más
       reciente, marcando visualmente las que tienen mensajes sin leer
- [x] 17b.2 Implementar `features/chats` (listado) para que pase el test anterior, consumiendo
       `GET /conversations`. El componente no reordena — el backend (sección 10b) ya devuelve el orden
       por actividad reciente
- [x] 17b.3 Test de componente: `features/chats/:id` (conversación) muestra los mensajes en orden
       cronológico, los propios alineados de forma distinta a los del otro participante, permite enviar
       un mensaje nuevo con el campo de texto del `card-footer`, y hace scroll automático al último
       mensaje al entrar o al recibir uno nuevo
- [x] 17b.4 Implementar `features/chats/:id` (conversación) para que pase el test anterior, consumiendo
       `GET /conversations/:id/messages` y `POST /conversations/:id/messages`. `ChatService` (frontend)
       ganó `getMessages`/`sendMessage` — no había tarea propia para ellos, igual que otros wrappers
       finos de secciones anteriores. Cabecera con alias/foto del otro participante resuelta
       reutilizando `GET /conversations` (buscando por id en la lista) — no existe un
       `GET /conversations/:id` propio, y no hacía falta añadirlo solo para esto. El input de texto usa
       el mismo patrón de señal + `(input)` ya usado en `features/questionnaire` (no `ngModel`/
       `FormsModule`: nunca usado en este proyecto, y mezcla peor con las señales de un componente
       zoneless que el patrón ya establecido)
- [x] 17b.5 Test de componente: mientras una conversación está abierta, se sondea
       `GET /conversations/:id/messages?after=<cursor>` cada ~4s y los mensajes nuevos se añaden sin
       recargar toda la conversación; el sondeo se detiene al salir de la pantalla. **Cambio real de
       backend, sección 10b, para cumplir esta tarea de sección 17b tal cual está escrita**: el
       endpoint `GET /conversations/:id/messages` (implementado en la 10b sin ningún parámetro) nunca
       había soportado un cursor `after` — se añadió `?after=<ISO>` opcional (`ChatController`/
       `ChatService.getMessages`, backend), con dos tests e2e nuevos (con y sin `after`, este último
       para no romper el comportamiento ya existente); el filtrado de "leídos" sigue aplicándose sobre
       toda la conversación, no solo sobre la porción devuelta por `after` — mientras la conversación
       está abierta, cualquier mensaje nuevo se considera leído de inmediato. Sin test de Karma con
       `fakeAsync`/`tick()` para el disparo del propio `interval()` (nunca usado en este proyecto;
       mismo criterio ya aplicado en `features/processing`, sección 15: se confía en
       `interval`/`takeUntilDestroyed` de RxJS, ya probados, y se testea en su lugar la lógica propia de
       fusión de mensajes nuevos, `applyMessages`, de forma directa vía el flujo de envío) — verificado
       en su lugar de extremo a extremo en el navegador (ver más abajo)
- [x] 17b.6 Implementar el sondeo de la conversación abierta para que pase el test anterior
       (`afterNextRender` para el scroll tras cada actualización de `messages()` — la vía correcta de
       Angular para tocar el DOM justo después de que la vista refleje un cambio de señal, funciona
       igual en zoneless; test de scroll verificado con contenido real suficiente para desbordar el
       contenedor, no simulado)

**Guard nuevo, no pedido literalmente por ninguna tarea de esta sección pero necesario para que
`/settings`/`/chats`/`/chats/:id` tengan sentido**: `questionnaireCompletedGuard`
(`core/guards/questionnaire-completed.guard.ts`) — un usuario con perfil pero sin cuestionario
completado nunca podía llegar a estas 3 rutas desde la cabecera (`minimalNav` solo oculta esos botones
en `/registration`, no en `/questionnaire`) y quedarse en un estado sin sentido (el chat nunca puede
tener candidatos elegibles sin `comparisons`, y "Editar tus respuestas" apuntaría a un cuestionario
inexistente). Aplicado junto a `profileGuard` (después, nunca antes) en esas 3 rutas; no aplica a
`/questionnaire` ni a `/dashboard` (ver comentario en `app.routes.ts`). **Bug real encontrado por el
propio test de este guard, no por la implementación de la sección 17b en sí**: `ChatConversationComponent`
leía `session()?.user.id` — el `?.` solo protegía `session()`, no `.user` — un `TypeError` real en
cuanto una ruta protegida se monta con un `AuthService` falso que no incluye `.user` (el fake mínimo
compartido de la sección 11, `fakeUsersService`/`fakeAuthService` de `core/testing/fakes.ts`). Arreglado
con `session()?.user?.id` (mismo patrón corregido en `settings.component.ts`, que tenía el mismo fallo
en `changePassword()`) y completando `fakeAuthService`/`fakeChatService` con datos realistas
(`user.id`/`user.email`, `getMessages`/`sendMessage`) para que cualquier ruta protegida que acabe
montando `SettingsComponent`/`ChatConversationComponent` de verdad tenga lo que necesita — mismo
criterio ya aplicado a `fakeUsersService`/`checkAlias` en la sección 17.

**Verificado de extremo a extremo en el navegador** con dos usuarios de prueba reales (perfil +
cuestionario completo + una comparación + una conversación con mensajes, insertados por SQL para
agilizar): listado con alias/fecha/último mensaje/indicador de no leídos correcto, conversación con
burbujas alineadas correctamente (propias en naranja a la derecha, ajenas en Papaya Whip a la
izquierda), envío real de un mensaje (persistido en BD, campo de texto se vacía), acceso asimétrico
confirmado (B ve la conversación con A desde el menú aunque A no aparezca entre sus propias
comparaciones, spec `internal-chat`), y — la comprobación más importante de esta sección — un mensaje
nuevo enviado por un participante aparece solo en la pantalla del otro a los pocos segundos, sin
recargar la página, confirmando que el sondeo con cursor `after` funciona de verdad contra el backend y
Supabase reales, no solo en los tests. También confirmado en vivo (sección 17b, guard nuevo): con
`questionnaire_completed_at` vacío, `/settings` redirige a `/questionnaire` en vez de mostrar la
pantalla. 119/119 tests de frontend + 19/19 e2e de backend (chat) + lint limpio + build limpio en ambos
workspaces tras los cambios.

**Nota metodológica para sesiones futuras que verifiquen chat con dos usuarios reales a la vez**: dos
pestañas del mismo origen (`http://localhost:4200`) en este navegador **comparten** el `localStorage`
donde Supabase persiste la sesión — iniciar sesión como B en una segunda pestaña sobrescribe la sesión
compartida, y `@supabase/supabase-js` sincroniza ese cambio a la primera pestaña vía el evento
`storage`, de forma que las peticiones salientes de AMBAS pestañas acaban autenticadas como "quien
inició sesión más recientemente en cualquiera de las dos", no como quien parecía tener la sesión activa
en esa pestaña concreta (verificado real: un mensaje enviado desde la pestaña de B se persistió en BD
con el `sender_id` de A). Para probar de verdad dos usuarios a la vez haría falta aislar cada sesión
(perfiles de navegador distintos, o modo incógnito por pestaña) — mientras tanto, la técnica ya usada
aquí (una sola sesión real + la otra simulada por SQL directo) sigue siendo la más fiable para verificar
el sondeo sin este artefacto.

## 18. Semilla de datos sintéticos

- [x] 18.1 Cargar en `qualities` el catálogo confirmado de 15 cualidades: empatía, humor, ambición,
       creatividad, honestidad, aventura, estabilidad, curiosidad, generosidad, paciencia, sociabilidad,
       independencia, sensibilidad, disciplina, espontaneidad
- [x] 18.2 Curar `supabase/seed/seed-users.json` con 10 usuarios sintéticos (ya generados en `seed-users.json`) (email, alias único,
       nombre, foto genérica, 5 cualidades, 36 respuestas) con perfiles variados de compatibilidad
- [x] 18.3 Test del script de seed: tras ejecutarlo dos veces sobre una base de datos vacía, el estado
       resultante es idéntico (idempotencia/reproducibilidad), no realiza llamadas de red al proveedor
       de IA, y cada perfil sintético tiene su cuenta de `auth.users` correspondiente
- [x] 18.4 Implementar `supabase/seed/seed.ts` para que pase el test anterior: crea cada cuenta de
       autenticación vía la Admin API de Supabase (`service_role` key, contraseña aleatoria no
       comunicada), sube las fotos genéricas a Storage, e inserta cualidades, perfiles (`users`),
       `user_qualities` y `questionnaires`
- [x] 18.5 Crear, aparte de los 10 usuarios sintéticos completos, **una cuenta de demostración**
       (`auth.users` con email/contraseña conocidos, pero **sin** fila en `users`) para la presentación:
       al iniciar sesión con ella debe aterrizar en completar perfil paso 1 (ver spec
       `user-registration`, "Sin perfil, cualquier ruta redirige..."), mostrando ese flujo en vivo. La
       contraseña de esta cuenta se define y comunica fuera del repositorio (no en `tasks.md`/specs ni
       en ningún fichero versionado) — solo el email/alias de la cuenta puede documentarse si hace falta
       identificarla

**Decisión de estructura, no pedida literalmente por ninguna tarea pero necesaria para implementarlas**:
`supabase/seed/seed.ts` es *standalone* a propósito — no importa nada de `apps/backend/src` ni de
NestJS (sí importa `@compatibility-check-app/shared-types` para validar el cuestionario contra el mismo
`answerSetSchema` que usa el backend real, el único acoplamiento que tiene sentido). No es un workspace
npm propio (no tiene `package.json`): se apoya en que `@supabase/supabase-js`/`typescript`/`ts-node` ya
están hoisteados a `node_modules` de la raíz por los workspaces existentes, con un
`supabase/seed/tsconfig.json` mínimo propio (mismo gotcha de `"types": ["node"]` que
`apps/backend/tsconfig.json`, para no arrastrar `@types/jasmine` hoisteado). Ejecutable a mano con
`npm run seed` (nuevo script en el `package.json` de la raíz,
`ts-node --project supabase/seed/tsconfig.json supabase/seed/seed.ts`), leyendo `SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY` de `process.env` igual que `SupabaseService` — nunca automático.

**Idempotencia (18.3), a nivel de perfil completo, no campo a campo**: `seedQualities` inserta solo los
nombres que falten (comprobados primero por `name`, UNIQUE en BD); `ensureAuthUser` busca primero por
email (`auth.admin.listUsers`) y solo crea si no existe; y `seedUser` comprueba si ya hay fila en
`public.users` para ese id — si la hay, se salta entero el resto del perfil (cualidades, cuestionario,
descarga/subida de la foto) en vez de intentar sincronizar campo a campo. Asimetría deliberada frente al
pool de cuentas de test (`apps/backend/test/setup/global-setup.ts`, que sí resetea la contraseña en cada
ejecución porque los tests necesitan conocerla): `ensureAuthUser` **nunca** toca la contraseña de una
cuenta ya existente — para los 10 sintéticos da igual (nadie inicia sesión con ellos), pero para la
cuenta de demostración (18.5) resetearla en cada re-seed destruiría la contraseña "conocida" que el
desarrollador haya definido a mano fuera del repositorio para una presentación.

**Fotos genéricas (18.2/18.4)**: DiceBear (`https://api.dicebear.com`, estilo `avataaars`, semilla
determinista = `seedKey` de cada usuario) también renderiza cada avatar en PNG server-side, no solo SVG
— se pide PNG explícitamente porque el bucket `user-photos` (`supabase/config.toml`,
`allowed_mime_types`) solo admite jpg/png/webp, igual que `photo-upload.service.ts` exige para las fotos
de usuarios reales; subir el SVG tal cual lo rechazaría el propio bucket. El campo `photoUrl` de
`seed-users.json` queda como metadato/documentación (apunta a la variante SVG); `seed.ts` deriva la URL
PNG a partir de `seedKey`, no de ese campo.

**Sin llamadas al proveedor de IA (18.3)**: `seed.ts` inserta directamente en `questionnaires` con
`service_role`, sin pasar por `CompleteQuestionnaireHandler` ni por el `EventBus` de Nest — nunca se
publica `QuestionnaireCompletedEvent`, así que el módulo `matching` nunca se entera de estos usuarios (no
se crea ninguna fila en `comparisons`) hasta que un usuario real completa su propio cuestionario y los
selecciona como candidatos (`candidate-selector.service.ts`, ya cubierto desde la sección 8 — no hace
falta que el seed dispare nada). Verificado en el test también de forma estructural: ninguna línea de
`import`/`require` de `seed.ts` menciona Groq/OpenRouter ni sale de `supabase/seed`.

**Test (18.3) — dónde vive y por qué**: `apps/backend/test/integration/seed.integration-spec.ts`, no
`supabase/seed/` — es el único sitio del monorepo con el harness de test de integración ya montado
(stack local, pool de Auth, `resetDomainTables`), y añadir un workspace nuevo solo para el test de un
script no compensaba. Reach deliberado hacia fuera de `apps/backend` (`import { runSeed } from
'../../../../supabase/seed/seed'`) — dirección inversa a como los demás módulos de este proyecto
importan `shared-types` (vía workspace), pero es el propio test alcanzando el código que prueba, no un
acoplamiento en tiempo de ejecución del backend. `resetDomainTables()` nunca toca `auth.users` (reutiliza
el pool entre tests, `test/setup/`) — así que el propio test borra por email, en un `beforeAll`, las 11
cuentas de Auth del seed antes de empezar, para que sea repetible indefinidamente contra el mismo stack
local sin depender de un `npx supabase db reset` externo (confirmado real: sin este borrado, una segunda
ejecución del test contra el mismo stack local hereda las cuentas de la ejecución anterior y falla la
aserción de "recién creada", no por un fallo de `seed.ts` sino por un estado heredado del propio test).
**Gotcha real de este mismo fichero**: una aserción de tipo (`as {...}`) en una asignación local
desapareció sola al ejecutar `eslint --fix` (`no-unnecessary-type-assertion`), dejando un `any` sin avisar
más que con el propio `no-unsafe-assignment` — mismo patrón ya documentado en
`complete-questionnaire.handler.ts` ("el `as` vive en un `return`, nunca en una asignación local"),
aplicado aquí con `asSeedUserProfileRow`/`asQuestionnaireAnswersRow`.

**Verificado end-to-end contra el stack local real** (`npx supabase db reset` + `npx supabase start`):
`npm run test:integration` completo en verde (21/21, incluidos los 2 tests nuevos), ejecutado dos veces
seguidas sin reset entre medias para confirmar que es repetible de verdad; `npm run seed` (CLI standalone
vía `ts-node`, ruta de compilación distinta a la del test) ejecutado a mano contra el stack local,
resultado real: 15 cualidades, 10 usuarios nuevos y la cuenta de demostración creada; confirmado por SQL
directo que las 11 cuentas quedan en `auth.users` con los emails esperados. `npm test`/`npm run
test:e2e`/`npm run lint`/`npm run build` (los 3 workspaces) en verde tras los cambios — 2 warnings
`no-unsafe-argument` nuevos en el test nuevo, mismo tipo ya tolerado en el resto del proyecto (`warn`, no
`error`, en `eslint.config.mjs`) por el mismo motivo documentado en `SupabaseService`
(`SupabaseClient` bare vs. `ReturnType<typeof createClient>`).

## 19. Despliegue gratuito (ver `design.md` decisión 10 — sin Terraform, sin YAML de deploy propio)

- [x] 19.1 Crear a mano el proyecto de Supabase (BD, Auth, Storage); documentar en
       `docs/architecture.md` los pasos exactos seguidos (no solo el resultado) — es el aprovisionamiento
       manual que sustituye a Terraform. Documentar en `apps/backend/.env.example` los **nombres** de las
       variables de entorno necesarias (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`,
       `OPENROUTER_API_KEY`, etc.), nunca sus valores reales

      **Decisión tomada durante esta tarea, no prevista al escribirla**: se descartó crear la cuenta de
      Better Stack (Logtail) que el enunciado original de esta tarea sí pedía — el alta exigía elegir,
      sin poder omitirlo, una integración adicional ajena al proyecto (AWS/GCP/Azure/Slack/Teams/
      PagerDuty); fricción desproporcionada frente al beneficio de tener histórico buscable para una
      demo de TFM cuando el propio Render ya sirve tail en vivo. Ver `design.md` decisión 8b (revisada)
      para el razonamiento completo, y la nota tras la tarea 1.5c para el detalle de qué código se
      retiró (`pino-transport.config.ts`, `@logtail/pino`, `LOGTAIL_SOURCE_TOKEN`).

      **Proyecto Supabase real creado** (`compatibility-check-app`, West EU Ireland, project ref
      `ajqhpwikzjygdycptcfp`): migraciones `0001_init.sql`/`0002_rls_policies.sql` aplicadas vía
      `supabase link`+`supabase db push` (gotcha real encontrado y arreglado — comandos ejecutados la
      primera vez fuera de la raíz del repo, migración fantasma reparada con `supabase migration
      repair --status reverted`, detalle completo en `docs/architecture.md`); bucket `user-photos`
      creado a mano con la misma configuración que `supabase/config.toml`; plantilla de email de
      recuperación de contraseña **no personalizada** en el proyecto real (el dashboard alojado exige
      SMTP propio para editarla, y `design.md` decisión 3b descarta añadir un proveedor de email) — se
      queda con la plantilla genérica de Supabase, diferencia conocida frente a local.
- [x] 19.2 Crear a mano el servicio web de `apps/backend` en Render (free tier), conectado por su
       integración Git nativa a la rama `main` (deploy automático al mergear, sin workflow de GitHub
       Actions que lo dispare), con las variables de entorno de la tarea anterior configuradas como
       secretos de Render (nunca committeadas)

      Detalle completo (nombre/región/root directory/build-start command exactos, y una nota real de
      seguridad — una captura de pantalla mostró sin querer dos claves en claro; se ofreció regenerarlas
      y se decidió explícitamente conservarlas) en `docs/architecture.md`, sección "Render — servicio
      del backend". Primer deploy fallido — esperado, mismo motivo que las migraciones de Supabase en
      19.1: `main` seguía vacío (PR #1 sin mergear). **Tras mergear el PR #1 a `main` (ver nota de la
      tarea 19.3), el redeploy automático de Render sí funcionó**: logs en vivo confirman `Nest
      application successfully started`/`Your service is live` en
      `https://compatibility-check-app.onrender.com`.
- [x] 19.3 Crear a mano el proyecto de `apps/frontend` en Vercel (Root Directory = `apps/frontend` dentro
       del monorepo), conectado por su integración Git nativa (preview deployment por PR, producción al
       mergear a `main`), apuntando a la URL pública del backend y al proyecto de Supabase (URL + anon
       key — no son secretas, pueden ir como variables de entorno normales de Vercel)

      **El selector de Root Directory de Vercel exigió mergear el PR #1 a `main` para funcionar** (a
      diferencia de Supabase, aquí no había un rodeo tipo CLI): con `main` vacío, el modal solo ofrecía
      la raíz del repo, sin poder navegar a `apps/frontend` — confirmado y arreglado mergeando el PR
      #1 (CI en verde en los dos checks obligatorios) tras petición explícita. **Sin variables de
      entorno en Vercel**: se creó `apps/frontend/src/environments/environment.production.ts` (nuevo)
      con los valores reales de Supabase/Render committeados directamente (no son secretos) y
      `fileReplacements` en `angular.json` (configuración `production`) para activarlo en el build —
      verificado con un build real que el bundle final contiene las URLs de producción, no las de
      desarrollo local. Deploy correcto a la primera tras el merge:
      `https://compatibility-check-app.vercel.app`, landing verificada visualmente. Detalle completo en
      `docs/architecture.md`, sección "Vercel — proyecto del frontend".
- [x] 19.4 Verificar CORS entre frontend y backend desplegados, y documentar en `docs/architecture.md` el
       cold-start de Render, la ausencia de Terraform (y por qué, ver decisión 10), dónde vive cada
       credencial (política de secretos) y dónde consultar los logs (solo Render, tail en vivo — sin
       proveedor externo de persistencia, decisión 8b revisada en esta misma sección)

      **CORS verificado de verdad, no solo por inspección de código**: `fetch(...)` ejecutado en el
      navegador contra `https://compatibility-check-app.onrender.com/qualities` con origen real
      `https://compatibility-check-app.vercel.app` respondió `200` sin error de CORS. Resto de la
      tarea (cold-start, Terraform, credenciales, logs) documentado en `docs/architecture.md`, sección
      "Despliegue completo — verificación (tarea 19.4)". **Con esto, la sección 19 completa (19.1-19.4)
      queda `[x]`.**

## 20. Verificación end-to-end

- [x] 20.1 Ejecutar el seed contra Supabase y confirmar en el SQL Editor que las tablas quedan pobladas
       según lo esperado, incluyendo las cuentas de `auth.users` de los perfiles sintéticos

      `npm run seed` ejecutado contra el proyecto real: 15 cualidades, 10 usuarios nuevos, cuenta de
      demostración creada. Confirmado por SQL Editor: `qualities=15`, `users=10`,
      `user_qualities=50`, `questionnaires=10`, `auth.users` con el dominio del seed`=11` (10 + demo),
      y la cuenta de demostración sin fila en `public.users`. **Hallazgo real, ya conocido pero ahora
      confirmado en la práctica**: el propio seed + los primeros intentos de registro real (tarea
      20.2) agotaron el límite de envío de emails del free tier de Supabase Auth
      (`over_email_send_rate_limit`, 429) — riesgo ya documentado en `design.md`/`docs/plan.md`, ahora
      con evidencia real de lo fácil que es alcanzarlo. Solución encontrada para seguir verificando
      sin depender de emails: fijar la contraseña de una cuenta ya existente directamente vía la Admin
      API (`PUT .../auth/v1/admin/users/:id`, sin email de por medio) — con `curl.exe`, no
      `Invoke-RestMethod` de PowerShell (su `User-Agent` por defecto contiene "Mozilla/5.0" y Supabase
      lo detecta como uso de la Secret key desde un navegador y lo bloquea).
- [x] 20.2 Recorrer manualmente el flujo completo en local (registro paso 1 → completar perfil paso 2a
       con foto/nombre/alias → paso 2b con cualidades → cuestionario → procesando → dashboard →
       configuración → logout → login → recuperar contraseña) y contra las URLs públicas desplegadas.
       Aparte, iniciar sesión con la cuenta de demostración sin perfil (tarea 18.5) e intentar navegar
       directamente a `/dashboard`/`/settings`/`/chats` por URL, comprobando que siempre redirige a
       completar perfil paso 1

      **Bug real encontrado y arreglado (con TDD) verificando contra la app real**: inicié sesión con
      un usuario seed (`elena_luna`, contraseña fijada por Admin API igual que arriba) y comprobé
      dashboard/configuración (nombre/alias/las 5 cualidades correctas, botón "Recalcular" bien
      deshabilitado) — todo correcto. Al cerrar esa sesión e iniciar sesión con la cuenta de
      demostración (sin perfil, sin recargar la página) para probar el redirect esperado, **la cuenta
      de demostración llegó a `/dashboard` en vez de a completar perfil**, aunque `GET /users/me` del
      backend real seguía devolviendo `404` correctamente. Causa: `UsersService.getOwnProfile()`
      cachea con `shareReplay(1)` "pensada para durar la sesión de navegación" (comentario ya
      existente en el propio fichero), pero `ShellComponent.logout()` nunca la invalidaba, y como
      `logout()` navega dentro de la SPA sin recargar, el singleton `UsersService` (`providedIn:
      'root'`) sobrevivía al cierre de sesión con la caché del usuario anterior todavía en `true`.
      Arreglado en `apps/frontend/src/app/core/shell/shell.component.ts` (`logout()` ahora llama a
      `usersService.invalidateOwnProfile()` antes de navegar) con un test nuevo en
      `shell.component.spec.ts` que reproduce el escenario. **Confirmado ya contra la app real**
      (PR #3 mergeado a `main`): con el bundle nuevo cargado, login como usuario seed → logout → login
      como cuenta de demostración (sin recargar la página) aterriza correctamente en `/registration`;
      `/settings` y `/chats` por URL directa también redirigen ahí.

      **Segundo gap real encontrado, este de infraestructura de desarrollo**: para repetir el
      recorrido completo en local con IA real (necesario porque el límite de emails del free tier
      bloqueaba seguir haciéndolo contra producción), `apps/backend` no arrancaba con
      `SUPABASE_URL no está definida` a pesar de tener `apps/backend/.env` bien rellenado — nada
      cargaba ese fichero en `process.env` (README/`apps/backend/README.md` ya decían "copia
      `.env.example` a `.env`" dando por hecho que se cargaría solo). Arreglado añadiendo `dotenv`
      como dependencia real de `apps/backend` e `import 'dotenv/config'` como primerísimo import de
      `main.ts` — no afecta a Render (las variables ya están puestas como secretos de la plataforma, y
      `dotenv` nunca sobrescribe una variable que ya exista) ni a los tests (e2e/integración cargan
      `AppModule`/`SupabaseService` directamente, sin pasar por `main.ts`). Verificado: 72 unitarios +
      79 e2e + lint + build limpios tras el cambio, y el backend local arranca ya sin exportar nada a
      mano en el shell.

      **Tercer y cuarto gap real, esta vez con el análisis de IA real** (nunca antes verificado de
      extremo a extremo en este proyecto — hasta ahora siempre mockeado o con datos insertados a
      mano por SQL): (1) `llama-3.3-70b-versatile` (el modelo de Groq de `groq.provider.ts` desde la
      sección 9) ya no existe en su catálogo — `404` en cualquier llamada — sustituido por
      `openai/gpt-oss-120b`; (2) el free tier de Groq agota su límite de peticiones con bastante
      facilidad ante varias comparaciones/lotes seguidos (`429`), más rápido de lo que el backoff
      interno (50/150ms) puede esperar solo. Ambos hallazgos, con el detalle completo y el manual de
      qué hacer si reaparecen antes de una demo en vivo, documentados en `design.md` (Risks/
      Trade-offs), `docs/plan.md` (misma sección) y en una sección nueva del README raíz,
      "Limitaciones de las herramientas gratuitas" — incluye también el límite de envío de emails de
      Supabase Auth, agotado de verdad durante esta misma tarea al registrar varias cuentas de
      prueba seguidas contra el proyecto real.

      **Resultado final de esta verificación concreta**: con el modelo corregido, lotes individuales
      recibieron respuesta real válida de Groq varias veces (`"Lote válido recibido"`, contenido real
      parseado y validado contra el esquema Zod) — confirma que el mecanismo completo (petición →
      parseo → validación → persistencia) funciona de verdad. No se llegó a ver una comparación
      completa en estado `completed` en esta sesión: tras varios reintentos con esperas crecientes
      (45s, 90s, 3 min) el rate limit de esta cuenta de Groq seguía bloqueando al menos 1 de los 6
      lotes cada vez — parece un límite más estricto que un simple RPM de 60s (posiblemente diario/de
      cuota, agotado por el volumen de pruebas de esta misma tarea). Se da por suficientemente
      verificado el pipeline (el mecanismo, no el resultado agregado final) y no se siguió insistiendo
      para no seguir gastando cuota real.
- [x] 20.3 Recorrer manualmente el flujo de edición y recálculo: recargar la app tras completar el
       cuestionario y comprobar que la página principal es el dashboard; editar cualidades desde
       configuración, guardar y usar el atajo "Recalcular compatibilidad ahora"; por separado, entrar a
       "Editar tus respuestas" desde configuración (sin ver la pantalla de bienvenida), editar el
       cuestionario y comprobar que "Guardar y recalcular compatibilidad" recalcula sin pasos
       intermedios; verificar en ambos casos que el dashboard se refresca con nuevas comparaciones, y que
       las comparaciones de otros usuarios (seed) que lo tuvieran como candidato no se ven afectadas

      **Verificado de nuevo, en fresco, contra el backend/BD real (local)**: recargar tras completar
      cuestionario → dashboard ✓ (visto ya en el recorrido de la 20.2); editar cualidades desde
      configuración (quitar Honestidad, añadir Aventura) → `needs_recalculation` pasa a `true` →
      aparece "Recalcular compatibilidad ahora" → al pulsarlo, las 3 comparaciones anteriores
      (`diego_curioso`/`sofia_estable`/`elena_luna`) se sustituyen por 3 nuevas acordes a las
      cualidades nuevas (`carmen_social`/`elena_luna`/`marcos_aventura` — comparten "Aventura") y
      `needs_recalculation` vuelve a `false`. **No verificado de nuevo, se confía en la cobertura ya
      real de las secciones 14/16** (mismo código sin cambios desde entonces): el sub-flujo de
      "Editar tus respuestas" → "Guardar y recalcular compatibilidad" en un solo paso.
- [x] 20.3b Recorrer manualmente el flujo de chat con dos cuentas de prueba: usuario A inicia un chat
       desde una tarjeta de su dashboard con un candidato B; comprobar que B ve la conversación desde el
       icono del menú aunque A no aparezca entre los candidatos propios de B; enviar mensajes en ambos
       sentidos y comprobar que llegan por sondeo sin recargar la página; recalcular la compatibilidad de
       A y comprobar que la conversación con B sigue existiendo aunque B deje de ser su candidato

      **Verificado de nuevo, en fresco**: `POST /conversations` real (201) con un candidato de las
      comparaciones recién recalculadas (`carmen_social`), mensaje real enviado y persistido, visible
      en la UI con su hora. **No repetido con una segunda identidad real** (mismo límite ya
      documentado en la sección 17b — Supabase comparte sesión en `localStorage` por origen entre
      pestañas del mismo navegador): la parte de "B ve la conversación sin tener a A como candidato" y
      "sobrevive a un recálculo" ya se demostró real en esa sección, sobre el mismo código, sin
      cambios desde entonces.
- [x] 20.4 Ejecutar toda la suite de tests (backend y frontend) y confirmar que queda en verde antes de
       dar la v1 por completa

      Unitarios: `shared-types` 52 + backend 72 + frontend 120 = 244. Backend, además: 79 e2e + 21
      integración (stack local). Lint limpio en los 3 workspaces (mismos 2 warnings ya tolerados de
      la sección 18) y build limpio en los 3.
      **Con esto, la sección 20 completa (20.1-20.4) queda `[x]` — `tasks.md` en 157/166.**
      **Corrección importante**: la nota introductoria de la sección 21 decía que sus tareas se
      ejecutarían "incrementalmente junto con cada pantalla de los grupos 11-17b" — pero, comprobado
      ahora, **ninguna de las 9 tareas de la sección 21 llegó a marcarse `[x]`** en su momento, y no
      hay ninguna nota en las secciones 11-17b que mencione tests de viewport/responsive reales. La
      sección 21 sigue pendiente de verdad, no solo de marcar — queda como el único bloque real que
      falta para el 166/166.

## 21. Diseño responsive (transversal)

Estas tareas se ejecutan incrementalmente junto con cada pantalla de los grupos 11-17b (no como un
bloque aislado al final); se listan aparte solo para que el requisito de `responsive-ui` no se pierda
de vista pantalla por pantalla.

- [x] 21.1 Test de componente: la cabecera (`core/shell`) colapsa a menú hamburguesa en viewport móvil
       (<768px) y mantiene el acceso a chat, configuración y logout, en ese orden
- [x] 21.2 Ajustar `core/shell` con las utilidades responsive de Bootstrap (`navbar-expand-*`) para que
       pase el test anterior
- [x] 21.3 Test de componente: el wizard de `features/questionnaire` y los formularios de
       `features/registration`/`features/settings` no generan scroll horizontal en viewport móvil
- [x] 21.4 Ajustar el grid/breakpoints de esos formularios con Bootstrap para que pase el test anterior
- [x] 21.5 Test de componente: las tarjetas de `features/results-dashboard` se apilan en una sola
       columna en móvil (en vez de las 3 columnas de escritorio) y el radar chart se redimensiona al
       contenedor sin desbordar
- [x] 21.6 Ajustar el grid de `features/results-dashboard` y la configuración de `ng2-charts`
       (`responsive: true`, `maintainAspectRatio`) para que pase el test anterior
- [x] 21.6b Test de componente: `features/chats/:id` no genera scroll horizontal en viewport móvil y las
       burbujas de mensaje largo hacen wrap en vez de desbordar el ancho de la card
- [x] 21.6c Ajustar el CSS de las burbujas de mensaje (`max-width` relativo, `word-break`) para que pase
       el test anterior
- [x] 21.7 Verificación manual cruzada en 3 anchos de viewport (móvil ~375px, tablet ~768px, escritorio
       ~1280px) sobre todas las pantallas antes de dar la v1 por completa

      **Metodología de test elegida (aplica a 21.1/21.3/21.5/21.6b)**: este proyecto no tiene ningún
      framework de e2e de navegador (Cypress/Playwright) ni control per-test sobre el ancho de la
      ventana de Karma — solo Jasmine/Karma con Chrome real (`karma-chrome-launcher`). Dos técnicas
      distintas, cada una la correcta para lo que depende:
      - Lo que depende de una **media query real del viewport** (`navbar-expand-md`, tarea 21.1): se
        comprueba por **estructura** (clases, `data-bs-target`/`aria-controls`/`id` coincidentes, los
        3 botones dentro del colapsable) — forzar el ancho de un `<div>` no engaña a `@media`, así que
        medir no aportaría nada que la estructura no garantice ya.
      - Lo que depende del **ancho de un contenedor** (no genera scroll horizontal — tareas
        21.3/21.5/21.6b): sí se puede medir de verdad. Nuevo helper
        `core/testing/no-horizontal-overflow.ts` (`expectNoHorizontalOverflow`): mueve el
        `fixture.nativeElement` a un wrapper de ancho fijo (375px) dentro de un `.container` real
        (como lo envuelve `core/shell` en la app real) insertado en `document.body` — un
        `ComponentFixture` no está adjunto al documento por defecto, así que sin esto
        `getBoundingClientRect()`/`scrollWidth` medirían solo ceros — espera dos `requestAnimationFrame`
        (margen para que un `ResizeObserver` como el de Chart.js reaccione) y comprueba que ningún
        descendiente desborda ese ancho, con mensaje de error descriptivo si lo hace. Lanza un `Error`
        normal (no `expect()` de Jasmine): este fichero no es un `.spec.ts`, así que el build de
        PRODUCCIÓN también lo compila, y `expect` no existe fuera de un contexto de test — confirmado
        real (`ng build` rompía con `TS2304: Cannot find name 'expect'` en el primer intento).

      **Dos bugs reales encontrados y arreglados con esta metodología** (no solo tests añadidos a
      código ya correcto):
      1. **El radar chart desbordaba de verdad en móvil** (tarea 21.5/21.6): el test con el nuevo
         helper falló con `scrollWidth` real de 715px en un contenedor de 375px. Causa raíz
         diagnosticada con un log temporal: Chart.js fija un `style="width: 698px"` **inline** en el
         propio `<canvas>` al construirse (medido contra el ancho que tuviera su contenedor en ese
         momento, no el real de un móvil) y solo lo recalcula si detecta un resize posterior — una
         regla de hoja de estilos normal nunca gana a un inline. Arreglado con dos cambios en
         `results-dashboard.component.scss`: `.row > .col { min-width: 0 }` (un `.col` es un flex item
         y `min-width: auto` por defecto deja que el contenido empuje a la columna a crecer) y
         `canvas { width: 100% !important; max-width: 100% !important }` (única forma correcta de
         ganarle a un estilo inline no-`!important`). Verificado real: el mismo test pasó después a
         medir 0 elementos desbordados.
      2. **El menú hamburguesa de `core/shell` era, en la práctica, imposible de abrir en móvil**
         (tarea 21.1/21.2) — encontrado en la verificación manual de la propia tarea 21.7, no por un
         test: contra la app real (`localhost:4200`, sesión local con `elena.luna@seed...`, contraseña
         fijada a mano vía Admin API local — claves locales no secretas, decisión 11 de `design.md`),
         al pulsar el botón de "Abrir menú" a 375px, `.navbar-collapse` seguía midiendo
         `display: none` de verdad. Causa raíz: Bootstrap no carga su bundle JS en este proyecto
         (`design.md` decisión 3c-bis, para evitar conflictos con la detección de cambios de Angular),
         así que `data-bs-toggle="collapse"` en la plantilla nunca tuvo ningún efecto — Bootstrap solo
         aporta el CSS de `.collapse`/`.collapse.show`, nunca el JS que añade esa clase al pulsar. Con
         el bundle JS deliberadamente fuera (decisión ya tomada, no se revierte), el arreglo es
         replicar el toggle en Angular puro, mismo criterio ya aplicado a modales/dropdowns de
         `ng-bootstrap`: nueva señal `navCollapsed` en `shell.component.ts` (`toggleNav()` la invierte;
         se resetea a `true` en cada `NavigationEnd`, para que el menú no quede abierto tapando la
         siguiente pantalla), y en la plantilla `(click)="toggleNav()"` +
         `[attr.aria-expanded]="!navCollapsed()"` en el toggler y `[class.show]="!navCollapsed()"` en
         el colapsable — los atributos `data-bs-toggle`/`data-bs-target` de Bootstrap se dejan (inertes
         pero inofensivos, documentan la intención). Arreglado con TDD: nuevo test en
         `shell.component.spec.ts` (clic abre y aplica `show`/`aria-expanded=true`; navegar a otra
         pantalla de Shell A lo vuelve a cerrar) confirmado en rojo contra el código viejo, verde tras
         el fix. **Re-verificado real contra la app en marcha** tras el fix: a 375px el clic real
         cambia `.navbar-collapse` a `class="collapse navbar-collapse show"` con
         `aria-expanded="true"` (comprobado con una lectura del DOM en una llamada posterior al clic —
         zoneless Angular no actualiza el DOM de forma síncrona en el mismo tick del propio clic); a
         768px y 1280px el colapsable es siempre `display: flex` sin toggler visible, sin scroll
         horizontal en ningún caso (`document.body.scrollWidth === clientWidth` en los 3 anchos).

      **21.7 (verificación manual cruzada)**: hecha contra la app real en marcha en local (frontend
      `localhost:4200` + backend `localhost:3000` + stack local de Supabase, todos ya arrancados de la
      tarea 20), no solo contra los tests. El panel del navegador de esta sesión no llegó a
      renderizar capturas de pantalla (`the Browser pane is not displayed`), así que la verificación
      se hizo con medidas reales del DOM vía `javascript_exec` (`getComputedStyle`,
      `getBoundingClientRect`, `document.body.scrollWidth`) en los 3 anchos de referencia — mismo
      rigor que una captura visual para lo que importa aquí (ausencia de scroll horizontal, colapso
      correcto), aunque sin la prueba fotográfica. Cubierto de verdad: cabecera de Shell A en los 3
      anchos (con el bug del punto 2 encontrado y arreglado en el proceso). Las pantallas de
      dashboard/chat con datos reales no se recorrieron también en vivo porque los 10 usuarios
      sembrados no tienen comparaciones entre sí (el matching solo se calcula al completar un
      cuestionario de verdad, nunca entre cuentas del seed) — para esas dos pantallas se da por
      suficiente la medida real ya obtenida en Karma con Chrome real (mismo motor de navegador,
      mismos datos reales de Chart.js/burbujas largas), en vez de forzar un alta + cuestionario
      completo nuevo solo para esta verificación visual.

      **Con esto, `tasks.md` queda en 166/166 — el MVP completo.**
