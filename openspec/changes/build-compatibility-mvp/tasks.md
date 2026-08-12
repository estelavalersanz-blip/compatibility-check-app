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

- [ ] 7.1 Test unitario: rechazo de cuestionarios con menos de 36 respuestas, preguntas duplicadas o
      usuario que ya tiene cuestionario guardado
- [ ] 7.2 Test e2e: `POST /users/me/questionnaire` (autenticado) con las 36 respuestas guarda el
      cuestionario y devuelve 200/201
- [ ] 7.3 Test unitario: `CompleteQuestionnaireCommandHandler` persiste el cuestionario y publica
      `QuestionnaireCompletedEvent` con el `user_id`, sin invocar directamente ningún servicio del
      módulo `matching`
- [ ] 7.4 Implementar `questionnaires.controller.ts` y `CompleteQuestionnaireCommand`/Handler
      (publicando `QuestionnaireCompletedEvent` al terminar) para que pasen los tests anteriores
- [ ] 7.5 Test e2e: `PATCH /users/me/questionnaire` (autenticado, con cuestionario ya existente)
      sustituye las 36 respuestas y marca `needs_recalculation = true`; rechaza con 4xx si no hay
      cuestionario previo o si el envío está incompleto
- [ ] 7.6 Implementar el endpoint de edición del cuestionario para que pase el test anterior
- [ ] 7.7 Test e2e: `PUT /users/me/questionnaire/draft` (autenticado) acepta entre 0 y 35 respuestas sin
      exigir el conjunto completo, no marca `questionnaire_completed_at` y no dispara
      `QuestionnaireCompletedEvent`; `GET /users/me/questionnaire` devuelve las respuestas guardadas
      hasta el momento (parciales o completas)
- [ ] 7.8 Implementar `questionnaires.service.ts` (servicio normal, sin Command) con los endpoints de
      guardado y lectura de borrador para que pasen los tests anteriores

## 8. Backend: módulo `matching` (selección de candidatos)

- [ ] 8.1 Test unitario de `candidate-selector.service.ts` con tabla de casos: 3+ candidatos
      disponibles, empate en cualidades coincidentes (desempate por antigüedad), 1-2 candidatos
      disponibles, 0 candidatos disponibles
- [ ] 8.2 Implementar `candidate-selector.service.ts` (consulta de pre-compatibilidad + creación de
      filas `comparisons` en estado `pending`) para que pasen los tests anteriores, con logging del
      resultado de la selección (`user_id`, candidatos elegidos, `shared_qualities_count`)
- [ ] 8.3 Test unitario/integración: al completar un usuario nuevo su cuestionario, verificar que NO se
      generan ni modifican comparaciones de usuarios ya existentes (regla de cálculo único)
- [ ] 8.4 Test unitario: el handler de `QuestionnaireCompletedEvent` en `matching` invoca a
      `candidate-selector.service.ts` con el `user_id` del evento y, si se crean una o más filas
      `comparisons`, publica `ComparisonsCreatedEvent` con la lista de `comparison_id` creados (y no
      publica nada si no hay candidatos disponibles)
- [ ] 8.5 Implementar el handler de `QuestionnaireCompletedEvent` y la publicación de
      `ComparisonsCreatedEvent` para que pase el test anterior
- [ ] 8.6 Test unitario: `RecalculateCompatibilityCommandHandler` solo actúa si
      `users.needs_recalculation = true` (rechaza en caso contrario), reutiliza
      `candidate-selector.service.ts`, elimina las comparaciones anteriores del usuario, publica
      `ComparisonsCreatedEvent` con las nuevas, y desmarca `needs_recalculation`
- [ ] 8.7 Implementar `RecalculateCompatibilityCommand`/Handler para que pase el test anterior
- [ ] 8.8 Test e2e: `POST /users/me/recalculate` (autenticado) despacha `RecalculateCompatibilityCommand`
      y devuelve 200/201 si `needs_recalculation` era `true`, o 4xx si no había nada pendiente de
      recalcular
- [ ] 8.9 Implementar el endpoint de recálculo para que pase el test anterior

## 9. Backend: módulo `ai` (orquestación de IA)

- [ ] 9.1 Definir `ai-provider.interface.ts` (contrato común para cualquier proveedor de IA)
- [ ] 9.2 Test unitario de `groq.provider.ts` contra un cliente HTTP mockeado: éxito, error de red,
      respuesta 429/rate-limit
- [ ] 9.3 Implementar `groq.provider.ts` para que pase el test anterior, con logging de cada llamada
      (proveedor, duración, resultado) sin incluir el contenido de las respuestas de usuario
- [ ] 9.4 Implementar `openrouter.provider.ts` siguiendo la misma interfaz y los mismos criterios de
      test/logging que `groq.provider.ts`
- [ ] 9.5 Escribir `prompts/compatibility-prompt.ts` con el prompt de "psicólogo especializado en
      relaciones" y el formato de salida JSON esperado (array de resultados por pregunta)
- [ ] 9.6 Test unitario de `schemas/comparison-result.schema.ts` (Zod): acepta un array válido de
      resultados, rechaza claves faltantes, valores fuera de 1.00–10.00 o con más de 2 decimales
- [ ] 9.7 Implementar el esquema Zod para que pase el test anterior
- [ ] 9.8 Test unitario de `ai-orchestrator.service.ts`: agrupa 36 preguntas en 6 lotes de 6, valida
      cada respuesta, reintenta hasta 3 veces con backoff ante respuesta inválida, marca `error` tras
      fallo persistente, y respeta el límite de 2 lotes concurrentes por comparación
- [ ] 9.9 Implementar `ai-orchestrator.service.ts` para que pase el test anterior, instrumentando log
      de envío/recepción/reintento de cada lote con `comparison_id` y `question_ids` propagados, sin
      loguear el contenido íntegro de las respuestas
- [ ] 9.10 Test unitario: el handler de `ComparisonsCreatedEvent` en `ai` dispara
      `ai-orchestrator.service.ts` para cada `comparison_id` recibido en el evento, sin que `matching`
      conozca la existencia del módulo `ai`
- [ ] 9.11 Implementar el handler de `ComparisonsCreatedEvent` para que pase el test anterior
- [ ] 9.12 Test e2e: `POST /comparisons/:id/reanalyze` sobre una comparación en `error` despacha
      `AnalyzeComparisonCommand` y repite el análisis desde cero
- [ ] 9.13 Implementar `AnalyzeComparisonCommand`/Handler (invocado desde el endpoint de reintento
      manual y reutilizado por el handler de `ComparisonsCreatedEvent`) para que pase el test anterior

## 10. Backend: módulo `comparisons` (agregado ponderado + endpoints de consulta)

- [ ] 10.1 Test unitario de `weighting.util.ts` (función pura) con tabla de casos: para cada dimensión,
       calcula la media ponderada de sus 6 bloques de preguntas (1–6, 7–12, ..., 31–36) con pesos
       5/5/15/20/25/30%, combina las 6 medias resultantes con los pesos por dimensión (20/25/10/25/
       10/10) para obtener `compatibilidad_final`, y redondea ambos a 2 decimales, sobre datos de
       prueba conocidos (incluyendo el caso de valores en los límites 1.00/10.00)
- [ ] 10.2 Implementar `weighting.util.ts` para que pase el test anterior, incluyendo el mapeo
       `questionId → índice de bloque (0–5)` y persistiendo ambos vectores de pesos en
       `weights: { dimension, block }`
- [ ] 10.3 Test e2e: `GET /users/me/comparisons` devuelve estado y datos del candidato (alias, foto,
       `shared_qualities_count`) de cada comparación, y el resultado agregado cuando está disponible
- [ ] 10.4 Test e2e: `GET /comparisons/:id/detail` devuelve el detalle de las 36 comparaciones por
       pregunta de una comparación completada (pregunta, puntuaciones por dimensión, `compatibilidad`,
       `explicación`), y **la respuesta no contiene en ningún campo** `respuesta_usuario_1` ni
       `respuesta_usuario_2`, aunque esos campos sí existan en el registro almacenado en BD
- [ ] 10.5 Implementar `results.controller.ts`/`comparisons.controller.ts` y los servicios necesarios,
       incluyendo el mapeo que filtra `respuesta_usuario_1`/`respuesta_usuario_2` del DTO de salida antes
       de responder, para que pasen los tests anteriores

## 10b. Backend: módulo `chat` (conversaciones y mensajes)

Las tablas `conversations`/`messages` y sus políticas RLS ya se crean en la sección 3 (0001_init.sql);
esta sección es la lógica de negocio y los endpoints que se apoyan en ellas.

- [ ] 10b.2 Test e2e: `POST /conversations` con un `candidateUserId` que sí aparece en las
       `comparisons` del usuario autenticado (como `requester_user_id`) crea la conversación y
       devuelve 201; si ya existía, devuelve la misma conversación sin duplicarla (idempotente)
- [ ] 10b.3 Test e2e: `POST /conversations` con un `candidateUserId` que **no** aparece entre las
       `comparisons` del usuario autenticado como `requester_user_id` devuelve 4xx sin crear nada
- [ ] 10b.4 Implementar `chat.controller.ts`/`chat.service.ts` para `POST /conversations`, validando la
       elegibilidad contra `comparisons` con `service_role` (igual que `matching`), para que pasen los
       tests anteriores
- [ ] 10b.5 Test e2e: `GET /conversations` devuelve las conversaciones del usuario autenticado (sea
       `user_a_id` o `user_b_id`), con alias/foto del otro participante, el último mensaje y si hay no
       leídos, ordenadas por actividad más reciente primero
- [ ] 10b.6 Test e2e: `GET /conversations/:id/messages` devuelve los mensajes de una conversación en
       orden cronológico y marca como leídos los mensajes dirigidos al usuario autenticado que estuvieran
       sin leer; devuelve 4xx si el usuario autenticado no es participante de esa conversación
- [ ] 10b.7 Test e2e: `POST /conversations/:id/messages` con un `body` no vacío persiste el mensaje y lo
       devuelve; con `body` vacío devuelve 4xx sin persistir nada; con un usuario no participante de la
       conversación devuelve 4xx
- [ ] 10b.8 Implementar los endpoints de los dos tests anteriores para que pasen, incluyendo el cálculo
       del contador de no leídos en `GET /conversations`

## 11. Frontend: shell de la aplicación autenticada

- [ ] 11.1 Test de componente: la cabecera muestra los botones de chat, configuración y cerrar sesión
       solo cuando hay una sesión activa, en ese orden (chat a la izquierda de configuración), y el
       botón de cerrar sesión limpia la sesión y redirige a autenticación
- [ ] 11.2 Implementar el layout/cabecera compartido (`core/shell` o similar) con los botones de chat,
       configuración y cerrar sesión (esquina superior derecha, en ese orden), para que pase el test
       anterior
- [ ] 11.2b Test de componente: el icono de chat de la cabecera muestra un indicador visual cuando
       `GET /conversations` reporta al menos un mensaje sin leer en cualquier conversación, y deja de
       mostrarlo cuando no queda ninguno
- [ ] 11.2c Implementar el sondeo del contador de no leídos (~20-30s) y el indicador en el icono de chat
       para que pase el test anterior
- [ ] 11.3 Test de componente/routing: **con sesión activa**, la ruta principal (`/`) resuelve a
       completar perfil (paso 1) si `GET /users/me` indica que el usuario no tiene fila de perfil aún;
       si tiene perfil pero no ha completado nunca su cuestionario, resuelve al cuestionario; en caso
       contrario, al dashboard de resultados — en ese orden de prioridad
- [ ] 11.4 Implementar el guard/resolver de enrutamiento de la página principal para que pase el test
       anterior
- [ ] 11.5 Test de routing: un usuario autenticado sin perfil que intenta navegar directamente (por URL)
       a `/questionnaire`, `/dashboard`, `/settings` o `/chats` es redirigido a completar perfil (paso
       1) en vez de acceder a la ruta solicitada; un usuario con perfil ya completado no sufre esa
       redirección (ver spec `user-registration`, "Sin perfil, cualquier ruta redirige...")
- [ ] 11.6 Implementar `ProfileGuard` (guard de ruta de Angular aplicado a todas las rutas autenticadas
       salvo `features/registration`) para que pase el test anterior, reutilizando la misma consulta a
       `GET /users/me` que el resolver de la tarea 11.4 (sin duplicar la llamada por cada guard)

## 11d. Frontend: landing pública (ver `design.md` decisión 3g)

- [ ] 11d.1 Test de componente/routing: **sin sesión activa**, la ruta principal (`/`) muestra
       `features/landing` (titular, subtítulo explicando el producto, un único botón); **con sesión
       activa**, `/` no muestra la landing y resuelve igual que el test 11.3
- [ ] 11d.2 Test de componente: el botón de la landing navega a `/auth/login`; con
       `prefers-reduced-motion: reduce` simulado, el titular/subtítulo/botón y el logo son visibles de
       inmediato sin depender de que termine ninguna animación
- [ ] 11d.3 Implementar `features/landing` (fondo degradado reutilizado de Shell B, animación de entrada
       del logo + titular/subtítulo/botón, degradado de fondo con desplazamiento lento) y el guard de `/`
       que decide entre landing y la resolución autenticada, para que pasen los tests anteriores

## 12. Frontend: autenticación

- [ ] 12.1 Test de componente: el formulario de login rechaza el envío con email/contraseña vacíos y
       muestra el error genérico de credenciales inválidas devuelto por el backend/Supabase
- [ ] 12.2 Implementar `features/auth/login` (email + contraseña + enlace "¿olvidaste tu contraseña?")
       usando `supabase.auth.signInWithPassword`, para que pase el test anterior
- [ ] 12.3 Test de componente: el formulario de registro (paso 1) valida formato de email y fortaleza
       mínima de contraseña antes de enviar, y muestra el error si el email ya existe
- [ ] 12.4 Implementar `features/auth/register` (paso 1: email + contraseña) usando
       `supabase.auth.signUp`, redirigiendo al paso 2 (completar perfil) tras el alta, para que pase el
       test anterior
- [ ] 12.5 Test de componente: el formulario de "olvidé mi contraseña" muestra siempre el mismo mensaje
       de confirmación, exista o no el email
- [ ] 12.6 Implementar `features/auth/forgot-password` usando `supabase.auth.resetPasswordForEmail`
       para que pase el test anterior
- [ ] 12.7 Implementar `features/auth/reset-password` (pantalla de destino del enlace del email) para
       establecer una nueva contraseña con `supabase.auth.updateUser`

## 13. Frontend: completar perfil (registro paso 2, wizard de 2 pasos — ver `design.md` decisión 3e)

- [ ] 13.0 Test de componente: la pantalla se presenta en 2 pasos con paginación por puntos (2 puntos,
       el actual relleno) — paso 1 (foto + nombre completo + alias) y paso 2 (cualidades); el botón
       "Siguiente" del paso 1 solo avanza de paso (no llama a `POST /users/me/profile`) y permanece
       deshabilitado mientras foto/nombre/alias no sean válidos; el envío real ocurre solo al pulsar
       "Finalizar" en el paso 2, con los datos de ambos pasos juntos en una única llamada
- [ ] 13.1 Test de componente: las 15 cualidades del paso 2 se muestran como píldoras (no cards); al
       llegar a 5 seleccionadas, las píldoras no marcadas quedan deshabilitadas (no se puede marcar una
       sexta) hasta que se desmarca alguna de las 5 — desmarcar siempre es posible; y "Finalizar"
       permanece deshabilitado mientras la selección no sea exactamente 5
- [ ] 13.2 Test de componente (paso 1): el campo de alias valida en vivo contra `GET /users/check-alias`
       y muestra si está disponible u ocupado
- [ ] 13.3 Test de componente: la cabecera de esta pantalla (Shell A) muestra el botón de cerrar sesión
       pero **no** el enlace de Configuración, a diferencia del resto de pantallas de Shell A
- [ ] 13.4 Implementar `features/registration` como wizard de 2 pasos (estado local `currentStep`, sin
       llamada al backend entre pasos), con subida de foto con preview circular y validación de alias en
       el paso 1, y las píldoras de cualidad (`shared/quality-pill`) en el paso 2, para que pasen los
       tests anteriores, consumiendo `GET /qualities`, `GET /users/check-alias` y — solo al pulsar
       "Finalizar" — `POST /users/me/profile` con los campos de ambos pasos

## 14. Frontend: cuestionario de 36 preguntas

- [ ] 14.0 Test de componente: en **modo creación** (primera vez), antes del bloque 1 se muestra una
       pantalla de bienvenida (fondo degradado, título "Cuestionario de compatibilidad", botón
       "Iniciar") que da paso al wizard solo al pulsarla; en **modo edición** esta pantalla no aparece
       nunca — se entra directo al wizard ya prerellenado (ver `design.md` decisión 3h)
- [ ] 14.1 Test de componente: las 36 preguntas se agrupan en 6 bloques presentados como un **wizard de
       6 pasos** — en cada momento solo se monta el bloque activo (nunca los 6 a la vez), con una flecha
       para volver al bloque anterior (o salir del cuestionario si es el bloque 1) y un botón para
       avanzar al siguiente sin exigir que el bloque actual esté completo
- [ ] 14.2 Test de componente: encima del bloque activo se muestra una barra de progreso segmentada en 6
       tramos con ancho proporcional al peso del bloque (5/15/20/25/30, ver `design-tokens.md`), cada
       tramo relleno según la proporción de sus 6 preguntas respondidas — sin mostrar el porcentaje de
       peso como texto en ningún sitio — y los bloques 1 y 2 (mismo peso, 5%) reciben exactamente el
       mismo ancho/gradiente
- [ ] 14.3 Test de componente: el `card-header` del bloque activo aplica la clase
       `question-block--weight-XX` según su peso (ver `design-tokens.md`), y un bloque ya completado
       (6/6) por el que ya se avanzó queda marcado con un check en su tramo de la barra de progreso
- [ ] 14.3b Test de componente: hacer clic en el tramo de un bloque ya visitado (índice ≤ el bloque más
       avanzado alcanzado) navega directamente a revisarlo/editarlo sin pasar por los bloques
       intermedios; los tramos de bloques aún no alcanzados no son clicables. Al revisar un bloque
       anterior, el botón del `card-footer` cambia a "Volver a donde estabas" y, al pulsarlo, regresa al
       bloque más avanzado alcanzado (no simplemente al siguiente)
- [ ] 14.4 Test de componente: al cargar la pantalla, se consulta `GET /users/me/questionnaire` y se
       prerellenan las respuestas ya guardadas (parciales o completas), posicionando el wizard en el
       primer bloque incompleto; cada respuesta se autoguarda contra `PUT /users/me/questionnaire/draft`
       (p. ej. al perder el foco o al cambiar de bloque), sin depender de `localStorage`
- [ ] 14.5 Test de componente: el botón del bloque 6 muestra "Enviar cuestionario" en modo creación o
       "Guardar y recalcular compatibilidad" en modo edición, y permanece deshabilitado mientras no haya
       respuesta para las 36 preguntas; en los bloques 1-5 el botón "Siguiente bloque" nunca se
       deshabilita por respuestas pendientes
- [ ] 14.5b Test de componente: en modo edición, pulsar el botón del bloque 6 encadena
       `PATCH /users/me/questionnaire` seguido de `POST /users/me/recalculate` (sin paso manual
       intermedio) y navega al dashboard al completarse ambas llamadas; en modo creación, pulsarlo llama
       solo a `POST /users/me/questionnaire` y navega a `features/processing`
- [ ] 14.6 Test de componente: dentro del bloque activo, cada pregunta ocupa toda la pantalla (ya no
       pestañas `NgbNav`); debajo hay una fila de 6 puntos + flechas prev/next, cada punto relleno si su
       pregunta está respondida, clicable para saltar directo a ella solo si ya fue visitada
       (`currentQuestionIndex`/`maxReachedQuestionIndex`, alcance local al bloque activo), y cambiar de
       pregunta aplica la transición de `question-pane` salvo que el test simule
       `prefers-reduced-motion: reduce`, en cuyo caso el cambio de pregunta sigue funcionando sin
       animación
- [ ] 14.7 Test de componente: el `textarea` de la pregunta activa ocupa el 100% del ancho de la card
       (no una columna estrecha) y tiene al menos `rows="4"` de alto
- [ ] 14.8 Implementar `features/questionnaire` como wizard de 6 pasos (un bloque montado a la vez, con
       `currentBlockIndex`/`maxReachedBlockIndex` para poder revisar bloques anteriores sin perder el
       sitio donde ibas), con la pantalla de bienvenida previa en modo creación (tarea 14.0), la barra de
       progreso segmentada por peso y sus tramos clicables, la cabecera con flecha de volver, el
       `card-header` con el gradiente del bloque activo, la navegación de puntos + flechas entre las 6
       preguntas del bloque activo (con su propio `currentQuestionIndex`/`maxReachedQuestionIndex`) y su
       transición, el `textarea` a ancho completo y `rows="4"`, el autoguardado de borrador y el botón
       del bloque 6 (`btn-dark`) condicionado según el modo (tarea 14.5/14.5b), para que pasen los tests
       anteriores
- [ ] 14.9 Diseñar `features/questionnaire` como componente reutilizable en modo "creación" (sin
       pantalla de bienvenida omitida, borrador + `POST /users/me/questionnaire` al final) y modo
       "edición" (sin pantalla de bienvenida, prerellenado, `PATCH /users/me/questionnaire` +
       `POST /users/me/recalculate` encadenados al final), accesible en modo edición como ruta propia
       (`/questionnaire?mode=edit`, no una vista embebida) desde el botón "Editar tus respuestas" de
       `features/settings`

## 15. Frontend: pantalla de procesamiento (ver `design.md` decisión 3f)

- [ ] 15.1 Test de componente: el polling se detiene al recibir todas las comparaciones en
       `completed`/`error` y navega al dashboard; mientras tanto muestra un spinner y una fila por cada
       candidato ya seleccionado con su icono de estado (pendiente/analizando, completado, error) — sin
       porcentaje agregado ni contador "N de 3"
- [ ] 15.2 Implementar `features/processing` para que pase el test anterior, consultando
       `GET /users/me/comparisons`

## 16. Frontend: dashboard de resultados

- [ ] 16.1 Test de componente: las tarjetas de resultado se ordenan de mayor a menor
       `compatibilidad_final`, muestran el alias del candidato (no el nombre), y el detalle de las 36
       preguntas solo se muestra al expandir
- [ ] 16.2 Test de componente: el detalle expandible de cada pregunta muestra el texto de la pregunta,
       sus puntuaciones por dimensión y la explicación de la IA, y **no renderiza en ningún elemento**
       el texto de la respuesta propia ni la del candidato, aunque el objeto recibido del backend
       llegara a incluirlos (defensa en profundidad además del filtrado en el backend)
- [ ] 16.3 Implementar `features/results-dashboard` (tarjetas con foto/alias/score, radar chart con
       `ng2-charts`, detalle expandible sin respuestas) para que pasen los tests anteriores, consumiendo
       `GET /users/me/comparisons` y `GET /comparisons/:id/detail`
- [ ] 16.4 Test de componente: el botón "recalcular compatibilidad" aparece deshabilitado/oculto cuando
       `needs_recalculation` es `false`, habilitado cuando es `true`, y tras pulsarlo y completarse el
       recálculo el dashboard se refresca con las nuevas tarjetas/gráficos
- [ ] 16.5 Implementar el botón de recalcular compatibilidad en `features/results-dashboard` para que
       pase el test anterior, consumiendo `POST /users/me/recalculate` y refrescando `GET
       /users/me/comparisons` tras completarse
- [ ] 16.6 Test de componente: cada tarjeta de resultado muestra un botón "Chatear" que, al pulsarlo,
       llama a `POST /conversations` con el candidato de esa tarjeta y navega a la conversación devuelta
- [ ] 16.7 Implementar el botón "Chatear" en cada tarjeta de `features/results-dashboard` para que pase
       el test anterior

## 17. Frontend: configuración de perfil

- [ ] 17.1 Test de componente: el formulario de configuración prerellena los datos actuales y aplica
       las mismas reglas de cualidades (píldoras `shared/quality-pill`, tope de marcado en 5, bloqueo de
       envío si ≠5) y de alias (validación en vivo) que el registro — aquí sí en un único formulario, no
       en el wizard de 2 pasos de `features/registration`
- [ ] 17.1b Test de componente: tras guardar cambios de perfil, si la respuesta indica
       `needsRecalculation = true`, aparece un aviso con un botón "Recalcular compatibilidad ahora" que
       llama a `POST /users/me/recalculate` y navega al dashboard; si no cambió la selección de
       cualidades, no aparece ningún aviso
- [ ] 17.2 Implementar `features/settings` (edición de nombre/alias/foto/cualidades, con el aviso y
       botón de la tarea anterior) para que pasen los tests anteriores, consumiendo `GET /users/me`,
       `PATCH /users/me` y `POST /users/me/recalculate`
- [ ] 17.3 Test de componente: el cambio de contraseña exige la contraseña actual y la reintenta contra
       Supabase antes de llamar a `updateUser`; si la contraseña actual es incorrecta, no se cambia
- [ ] 17.4 Implementar la sección de cambio de contraseña dentro de `features/settings` para que pase
       el test anterior
- [ ] 17.5 Test de componente: `features/settings` muestra un resumen del cuestionario (fecha de
       finalización) y un botón "Editar tus respuestas" que **navega** a `/questionnaire?mode=edit` (no
       despliega el wizard dentro de la propia pantalla de configuración)
- [ ] 17.6 Implementar la sección de cuestionario de `features/settings` (resumen + navegación) para
       que pase el test anterior — el guardado en sí, y el recálculo encadenado, viven en
       `features/questionnaire` en modo edición (tareas 14.5/14.5b/14.9), no se duplican aquí

## 17b. Frontend: chat interno

- [ ] 17b.1 Test de componente: `features/chats` (listado) muestra una fila por conversación con
       foto/alias del otro participante, el último mensaje y su fecha, ordenadas por actividad más
       reciente, marcando visualmente las que tienen mensajes sin leer
- [ ] 17b.2 Implementar `features/chats` (listado) para que pase el test anterior, consumiendo
       `GET /conversations`
- [ ] 17b.3 Test de componente: `features/chats/:id` (conversación) muestra los mensajes en orden
       cronológico, los propios alineados de forma distinta a los del otro participante, permite enviar
       un mensaje nuevo con el campo de texto del `card-footer`, y hace scroll automático al último
       mensaje al entrar o al recibir uno nuevo
- [ ] 17b.4 Implementar `features/chats/:id` (conversación) para que pase el test anterior, consumiendo
       `GET /conversations/:id/messages` y `POST /conversations/:id/messages`
- [ ] 17b.5 Test de componente: mientras una conversación está abierta, se sondea
       `GET /conversations/:id/messages?after=<cursor>` cada ~4s y los mensajes nuevos se añaden sin
       recargar toda la conversación; el sondeo se detiene al salir de la pantalla
- [ ] 17b.6 Implementar el sondeo de la conversación abierta para que pase el test anterior

## 18. Semilla de datos sintéticos

- [ ] 18.1 Cargar en `qualities` el catálogo confirmado de 15 cualidades: empatía, humor, ambición,
       creatividad, honestidad, aventura, estabilidad, curiosidad, generosidad, paciencia, sociabilidad,
       independencia, sensibilidad, disciplina, espontaneidad
- [ ] 18.2 Curar `supabase/seed/seed-users.json` con 10 usuarios sintéticos (ya generados en `seed-users.json`) (email, alias único,
       nombre, foto genérica, 5 cualidades, 36 respuestas) con perfiles variados de compatibilidad
- [ ] 18.3 Test del script de seed: tras ejecutarlo dos veces sobre una base de datos vacía, el estado
       resultante es idéntico (idempotencia/reproducibilidad), no realiza llamadas de red al proveedor
       de IA, y cada perfil sintético tiene su cuenta de `auth.users` correspondiente
- [ ] 18.4 Implementar `supabase/seed/seed.ts` para que pase el test anterior: crea cada cuenta de
       autenticación vía la Admin API de Supabase (`service_role` key, contraseña aleatoria no
       comunicada), sube las fotos genéricas a Storage, e inserta cualidades, perfiles (`users`),
       `user_qualities` y `questionnaires`
- [ ] 18.5 Crear, aparte de los 10 usuarios sintéticos completos, **una cuenta de demostración**
       (`auth.users` con email/contraseña conocidos, pero **sin** fila en `users`) para la presentación:
       al iniciar sesión con ella debe aterrizar en completar perfil paso 1 (ver spec
       `user-registration`, "Sin perfil, cualquier ruta redirige..."), mostrando ese flujo en vivo. La
       contraseña de esta cuenta se define y comunica fuera del repositorio (no en `tasks.md`/specs ni
       en ningún fichero versionado) — solo el email/alias de la cuenta puede documentarse si hace falta
       identificarla

## 19. Despliegue gratuito (ver `design.md` decisión 10 — sin Terraform, sin YAML de deploy propio)

- [ ] 19.1 Crear a mano el proyecto de Supabase (BD, Auth, Storage) y una cuenta gratuita de Better
       Stack (Logtail, decisión 8b) con su fuente/*source* para el backend; documentar en
       `docs/architecture.md` los pasos exactos seguidos (no solo el resultado) — es el aprovisionamiento
       manual que sustituye a Terraform. Documentar en `apps/backend/.env.example` los **nombres** de las
       variables de entorno necesarias (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`,
       `OPENROUTER_API_KEY`, `LOGTAIL_SOURCE_TOKEN`, etc.), nunca sus valores reales
- [ ] 19.2 Crear a mano el servicio web de `apps/backend` en Render (free tier), conectado por su
       integración Git nativa a la rama `main` (deploy automático al mergear, sin workflow de GitHub
       Actions que lo dispare), con las variables de entorno de la tarea anterior (incluida
       `LOGTAIL_SOURCE_TOKEN`) configuradas como secretos de Render (nunca committeadas)
- [ ] 19.3 Crear a mano el proyecto de `apps/frontend` en Vercel (Root Directory = `apps/frontend` dentro
       del monorepo), conectado por su integración Git nativa (preview deployment por PR, producción al
       mergear a `main`), apuntando a la URL pública del backend y al proyecto de Supabase (URL + anon
       key — no son secretas, pueden ir como variables de entorno normales de Vercel)
- [ ] 19.4 Verificar CORS entre frontend y backend desplegados, y documentar en `docs/architecture.md` el
       cold-start de Render, la ausencia de Terraform (y por qué, ver decisión 10), dónde vive cada
       credencial (política de secretos) y dónde consultar los logs (Render para tail en vivo, Better
       Stack/Logtail para histórico buscable, decisión 8b)

## 20. Verificación end-to-end

- [ ] 20.1 Ejecutar el seed contra Supabase y confirmar en el SQL Editor que las tablas quedan pobladas
       según lo esperado, incluyendo las cuentas de `auth.users` de los perfiles sintéticos
- [ ] 20.2 Recorrer manualmente el flujo completo en local (registro paso 1 → completar perfil paso 2a
       con foto/nombre/alias → paso 2b con cualidades → cuestionario → procesando → dashboard →
       configuración → logout → login → recuperar contraseña) y contra las URLs públicas desplegadas.
       Aparte, iniciar sesión con la cuenta de demostración sin perfil (tarea 18.5) e intentar navegar
       directamente a `/dashboard`/`/settings`/`/chats` por URL, comprobando que siempre redirige a
       completar perfil paso 1
- [ ] 20.3 Recorrer manualmente el flujo de edición y recálculo: recargar la app tras completar el
       cuestionario y comprobar que la página principal es el dashboard; editar cualidades desde
       configuración, guardar y usar el atajo "Recalcular compatibilidad ahora"; por separado, entrar a
       "Editar tus respuestas" desde configuración (sin ver la pantalla de bienvenida), editar el
       cuestionario y comprobar que "Guardar y recalcular compatibilidad" recalcula sin pasos
       intermedios; verificar en ambos casos que el dashboard se refresca con nuevas comparaciones, y que
       las comparaciones de otros usuarios (seed) que lo tuvieran como candidato no se ven afectadas
- [ ] 20.3b Recorrer manualmente el flujo de chat con dos cuentas de prueba: usuario A inicia un chat
       desde una tarjeta de su dashboard con un candidato B; comprobar que B ve la conversación desde el
       icono del menú aunque A no aparezca entre los candidatos propios de B; enviar mensajes en ambos
       sentidos y comprobar que llegan por sondeo sin recargar la página; recalcular la compatibilidad de
       A y comprobar que la conversación con B sigue existiendo aunque B deje de ser su candidato
- [ ] 20.4 Ejecutar toda la suite de tests (backend y frontend) y confirmar que queda en verde antes de
       dar la v1 por completa

## 21. Diseño responsive (transversal)

Estas tareas se ejecutan incrementalmente junto con cada pantalla de los grupos 11-17b (no como un
bloque aislado al final); se listan aparte solo para que el requisito de `responsive-ui` no se pierda
de vista pantalla por pantalla.

- [ ] 21.1 Test de componente: la cabecera (`core/shell`) colapsa a menú hamburguesa en viewport móvil
       (<768px) y mantiene el acceso a chat, configuración y logout, en ese orden
- [ ] 21.2 Ajustar `core/shell` con las utilidades responsive de Bootstrap (`navbar-expand-*`) para que
       pase el test anterior
- [ ] 21.3 Test de componente: el wizard de `features/questionnaire` y los formularios de
       `features/registration`/`features/settings` no generan scroll horizontal en viewport móvil
- [ ] 21.4 Ajustar el grid/breakpoints de esos formularios con Bootstrap para que pase el test anterior
- [ ] 21.5 Test de componente: las tarjetas de `features/results-dashboard` se apilan en una sola
       columna en móvil (en vez de las 3 columnas de escritorio) y el radar chart se redimensiona al
       contenedor sin desbordar
- [ ] 21.6 Ajustar el grid de `features/results-dashboard` y la configuración de `ng2-charts`
       (`responsive: true`, `maintainAspectRatio`) para que pase el test anterior
- [ ] 21.6b Test de componente: `features/chats/:id` no genera scroll horizontal en viewport móvil y las
       burbujas de mensaje largo hacen wrap en vez de desbordar el ancho de la card
- [ ] 21.6c Ajustar el CSS de las burbujas de mensaje (`max-width` relativo, `word-break`) para que pase
       el test anterior
- [ ] 21.7 Verificación manual cruzada en 3 anchos de viewport (móvil ~375px, tablet ~768px, escritorio
       ~1280px) sobre todas las pantallas antes de dar la v1 por completa
