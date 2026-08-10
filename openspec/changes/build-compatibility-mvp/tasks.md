## 1. Scaffold del monorepo

- [ ] 1.1 Crear `package.json` raíz con npm workspaces (`apps/*`, `packages/*`) y scripts comunes
      (lint, test, build) para todo el monorepo
- [ ] 1.2 Scaffolding de `apps/backend` con NestJS CLI (estructura de módulos, Jest configurado)
- [ ] 1.3 Scaffolding de `apps/frontend` con Angular CLI (routing, testing con Karma/Jasmine o
      Angular Testing Library configurado), añadiendo `@supabase/supabase-js` como dependencia para el
      cliente de autenticación
- [ ] 1.6 Instalar `bootstrap`, `bootstrap-icons` y `@ng-bootstrap/ng-bootstrap` en `apps/frontend`, y
      configurar `apps/frontend/src/styles.scss` para compilar Bootstrap desde su fuente Sass con los
      tokens de `.claude/skills/ui-design-consistency/references/design-tokens.md`
      (`$primary: #E67E22`, `$secondary: #D35400`, `$dark: #0D1B2A`, `$light: #FCF3CF`,
      `$font-family-base` con Poppins) sobrescritos antes del `@import`, en vez de usar el CSS
      precompilado de Bootstrap sin tokenizar
- [ ] 1.4 Configurar linters/formatters compartidos (ESLint + Prettier) para backend y frontend
- [ ] 1.5 Configurar un logger estructurado único en el backend (wrapper sobre `@nestjs/common Logger`
      con contexto por módulo) reutilizable desde cualquier servicio, sin `console.log` sueltos
- [ ] 1.7 Instalar `@nestjs/cqrs` en `apps/backend` para el uso selectivo de Commands/Events descrito
      en el diseño (no para las lecturas simples)
- [ ] 1.8 Test unitario: el interceptor de logging enganchado al `CommandBus` registra inicio, fin y
      resultado de cualquier Command despachado (incluyendo el caso de que el handler lance error), con
      un identificador de correlación propagado
- [ ] 1.9 Implementar el interceptor de logging del `CommandBus` para que pase el test anterior,
      reemplazando la necesidad de logging manual repetido en cada Command Handler

## 2. `packages/shared-types` (contrato compartido)

- [ ] 2.1 Test: validar con datos de ejemplo que `AnswerSet` acepta exactamente 36 elementos con
      `{questionId, question, answer}` y rechaza formas inválidas (usando un validador Zod expuesto
      junto al tipo)
- [ ] 2.2 Definir `answer-set.ts` (interfaz `AnswerSet` + esquema Zod de validación) para que pase el
      test anterior
- [ ] 2.3 Test: validar el esquema de `ComparisonResult` (claves exactas del JSON pedido, rangos
      1.00–10.00 en los campos numéricos) con casos válidos e inválidos
- [ ] 2.4 Definir `comparison-result.ts` (interfaz + esquema Zod) para que pase el test anterior
- [ ] 2.5 Definir `aggregated-result.ts` (interfaz `AggregatedResult` con las 6 dimensiones, el
      `compatibilidad_final` y `weights: { dimension, block }` con ambos vectores de pesos usados) y
      `quality.ts` (interfaz `Quality`)
- [ ] 2.6 Definir `questions.ts` con las 36 preguntas del cuestionario de compatibilidad (id, texto,
      categoría)
- [ ] 2.7 Definir `user-profile.ts` (interfaz `UserProfile`: id, name, alias, photoUrl,
      questionnaireCompletedAt) compartida entre backend y frontend

## 3. Base de datos y autenticación (Supabase)

- [ ] 3.1 Habilitar Supabase Auth (email/contraseña) en el proyecto y configurar la plantilla del email
      de recuperación de contraseña
- [ ] 3.2 Escribir `supabase/migrations/0001_init.sql` con las tablas `qualities`, `user_qualities`,
      `questionnaires`, `comparisons` (con `on delete cascade` hacia sus resultados por pregunta y
      agregado, para soportar el recálculo), `comparison_question_results`,
      `comparison_aggregated_results` y la tabla de perfil `users` (`id` FK a `auth.users.id`, `name`,
      `alias` con restricción `UNIQUE`, `photo_url`, `questionnaire_completed_at`,
      `needs_recalculation boolean not null default false`) e índices descritos en el diseño
- [ ] 3.3 Test de integración: con RLS activada, un usuario autenticado no puede leer ni escribir la
      fila de `users`/`questionnaires` de otro usuario a través del cliente directo de Supabase
- [ ] 3.4 Escribir las políticas RLS de `users`, `user_qualities` y `questionnaires`
      (`auth.uid() = id`/`user_id` para lectura y escritura propia) para que pase el test anterior
- [ ] 3.5 Crear el bucket público `user-photos` en Supabase Storage y documentar su configuración en
      `docs/architecture.md`
- [ ] 3.6 Implementar `apps/backend/src/supabase/supabase.service.ts` como única puerta de acceso a
      datos con la `service_role` key (para operaciones cross-usuario como el matching), sin exponer
      detalles de Postgres al resto de servicios

## 4. Backend: módulo `auth`

- [ ] 4.1 Test unitario: `SupabaseAuthGuard` acepta una request con un JWT de Supabase válido y
      rechaza una sin token o con token inválido/expirado
- [ ] 4.2 Implementar `auth/supabase-auth.guard.ts` para que pase el test anterior, aplicándolo a los
      endpoints protegidos de perfil, cuestionario y comparaciones
- [ ] 4.3 Test e2e: `GET /users/check-alias?alias=...` devuelve disponible/no disponible según exista
      ya el alias en BD (excluyendo el propio usuario si está autenticado)
- [ ] 4.4 Implementar el endpoint de comprobación de alias para que pase el test anterior

## 5. Backend: módulo `qualities`

- [ ] 5.1 Test e2e: `GET /qualities` devuelve las 15 cualidades del catálogo
- [ ] 5.2 Implementar `qualities.controller.ts` y `qualities.service.ts` para que pase el test anterior

## 6. Backend: módulo `users` (perfil)

- [ ] 6.1 Test unitario: `photo-upload.service.ts` sube archivos jpg/png/webp ≤2MB y rechaza formato o
      tamaño inválido (contra un cliente de Storage mockeado)
- [ ] 6.2 Implementar `photo-upload.service.ts` para que pase el test anterior, incluyendo logging del
      resultado de la subida (éxito/fallo, `user_id` si ya existe, sin loguear el binario)
- [ ] 6.3 Test e2e: `POST /users/me/profile` (tras autenticarse) crea el perfil con nombre, alias único
      y exactamente 5 cualidades válidas, devolviendo 201; rechaza con 4xx si el alias ya existe, hay
      ≠5 cualidades, foto inválida, campos faltantes, o no hay sesión autenticada
- [ ] 6.4 Implementar `CreateUserProfileCommand` y su `CommandHandler` (invocado desde
      `users.controller.ts` en `POST /users/me/profile`), con DTOs de validación y el manejo de la
      violación de la restricción `UNIQUE` de alias como condición de carrera, para que pasen los tests
      anteriores
- [ ] 6.5 Test e2e: `GET /users/me` devuelve el perfil del usuario autenticado (incluyendo
      `needs_recalculation`); `PATCH /users/me` actualiza nombre/alias/foto/cualidades con las mismas
      validaciones que la creación, y marca `needs_recalculation = true` únicamente cuando la selección
      de cualidades enviada difiere de la almacenada
- [ ] 6.6 Implementar los endpoints de consulta/edición de perfil para que pasen los tests anteriores

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

## 11. Frontend: shell de la aplicación autenticada

- [ ] 11.1 Test de componente: la cabecera muestra los botones de configuración y cerrar sesión solo
       cuando hay una sesión activa, y el botón de cerrar sesión limpia la sesión y redirige a
       autenticación
- [ ] 11.2 Implementar el layout/cabecera compartido (`core/shell` o similar) con los botones de
       configuración (esquina superior derecha) y logout, para que pase el test anterior
- [ ] 11.3 Test de componente/routing: la ruta principal (`/`) resuelve al cuestionario si
       `GET /users/me` indica que el usuario no ha completado nunca su cuestionario, y al dashboard de
       resultados en caso contrario
- [ ] 11.4 Implementar el guard/resolver de enrutamiento de la página principal para que pase el test
       anterior

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

## 13. Frontend: completar perfil (registro paso 2)

- [ ] 13.1 Test de componente: las 15 cualidades se muestran como cards independientes; al llegar a 5
       seleccionadas se bloquea marcar una más, y el control de envío permanece deshabilitado mientras
       la selección no sea exactamente 5, aunque el resto de campos estén completos
- [ ] 13.2 Test de componente: el campo de alias valida en vivo contra `GET /users/check-alias` y
       muestra si está disponible u ocupado
- [ ] 13.3 Test de componente: la cabecera de esta pantalla (Shell A) muestra el botón de cerrar sesión
       pero **no** el enlace de Configuración, a diferencia del resto de pantallas de Shell A
- [ ] 13.4 Implementar `features/registration` (formulario reactivo, subida de foto con preview,
       cards de cualidades, validación de alias) para que pasen los tests anteriores, consumiendo
       `GET /qualities`, `GET /users/check-alias` y `POST /users/me/profile`

## 14. Frontend: cuestionario de 36 preguntas

- [ ] 14.1 Test de componente: las 36 preguntas se agrupan en 6 paneles `NgbAccordion` (bloques 1-6),
       cada panel muestra una barra de progreso (no un contador numérico) con la proporción de sus 6
       preguntas respondidas, y los paneles se abren/cierran de forma independiente
- [ ] 14.2 Test de componente: cada panel aplica la clase `question-block--weight-XX` según su peso
       (5/15/20/25/30, ver `design-tokens.md`) sin mostrar el porcentaje como texto en ningún subtítulo
       ni en la cabecera previa al acordeón, y los bloques 1 y 2 (mismo peso, 5%) reciben exactamente
       la misma clase/estilo
- [ ] 14.3 Test de componente: al cargar la pantalla, se consulta `GET /users/me/questionnaire` y se
       prerellenan las respuestas ya guardadas (parciales o completas); cada respuesta se autoguarda
       contra `PUT /users/me/questionnaire/draft` (p. ej. al perder el foco o al cerrar un panel), sin
       depender de `localStorage` como mecanismo de persistencia
- [ ] 14.4 Test de componente: el botón "Enviar cuestionario" permanece deshabilitado mientras no haya
       respuesta para las 36 preguntas, y se habilita en cuanto se completan, sin importar si se
       completaron en la sesión actual o ya venían de un borrador guardado
- [ ] 14.5 Test de componente: dentro de un panel abierto, las 6 preguntas se muestran como pestañas
       `NgbNav` (una pregunta visible a la vez, no las 6 apiladas), cada pestaña refleja si su pregunta
       está respondida, y cambiar de pestaña aplica la transición de `question-pane` salvo que el test
       simule `prefers-reduced-motion: reduce`, en cuyo caso el cambio de pestaña sigue funcionando sin
       animación
- [ ] 14.6 Test de componente: el `textarea` de la pregunta activa ocupa el 100% del ancho del panel
       (no una columna estrecha) y tiene al menos `rows="4"` de alto
- [ ] 14.7 Implementar `features/questionnaire` con el acordeón de 6 paneles, su gradiente por peso, las
       pestañas por pregunta con su transición, el `textarea` a ancho completo y `rows="4"`, el
       autoguardado de borrador y el botón de envío condicionado, para que pasen los tests anteriores,
       enviando el envío final a `POST /users/me/questionnaire`
- [ ] 14.8 Diseñar `features/questionnaire` como componente reutilizable en modo "creación" (borrador +
       envío final a `POST /users/me/questionnaire`) y modo "edición" (envía a
       `PATCH /users/me/questionnaire`, prerellenado con las respuestas actuales), para reutilizarlo
       también desde `features/settings`

## 15. Frontend: pantalla de procesamiento

- [ ] 15.1 Test de componente: el polling se detiene al recibir todas las comparaciones en
       `completed`/`error` y muestra el progreso parcial mientras tanto
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

## 17. Frontend: configuración de perfil

- [ ] 17.1 Test de componente: el formulario de configuración prerellena los datos actuales y aplica
       las mismas reglas de cualidades (cards, bloqueo de envío si ≠5) y de alias (validación en vivo)
       que el registro
- [ ] 17.2 Implementar `features/settings` (edición de nombre/alias/foto/cualidades) para que pase el
       test anterior, consumiendo `GET /users/me` y `PATCH /users/me`
- [ ] 17.3 Test de componente: el cambio de contraseña exige la contraseña actual y la reintenta contra
       Supabase antes de llamar a `updateUser`; si la contraseña actual es incorrecta, no se cambia
- [ ] 17.4 Implementar la sección de cambio de contraseña dentro de `features/settings` para que pase
       el test anterior
- [ ] 17.5 Test de componente: `features/settings` incluye el `features/questionnaire` en modo edición
       (prerellenado) y, al guardarse correctamente, informa al usuario de que su compatibilidad quedó
       pendiente de recalcular
- [ ] 17.6 Integrar el cuestionario en modo edición dentro de `features/settings` para que pase el test
       anterior, consumiendo `PATCH /users/me/questionnaire`

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

## 19. Despliegue gratuito

- [ ] 19.1 Configurar proyecto en Supabase (BD, Auth, Storage) y documentar las variables de entorno
       necesarias en `apps/backend/.env.example`
- [ ] 19.2 Desplegar `apps/backend` en Render (free tier) con las variables de entorno configuradas
- [ ] 19.3 Desplegar `apps/frontend` en Vercel o Netlify apuntando a la URL pública del backend y al
       proyecto de Supabase (URL + anon key)
- [ ] 19.4 Verificar CORS entre frontend y backend desplegados, y documentar el cold-start de Render en
       `docs/architecture.md`

## 20. Verificación end-to-end

- [ ] 20.1 Ejecutar el seed contra Supabase y confirmar en el SQL Editor que las tablas quedan pobladas
       según lo esperado, incluyendo las cuentas de `auth.users` de los perfiles sintéticos
- [ ] 20.2 Recorrer manualmente el flujo completo en local (registro paso 1 → paso 2 con foto y
       cualidades → cuestionario → procesando → dashboard → configuración → logout → login → recuperar
       contraseña) y contra las URLs públicas desplegadas
- [ ] 20.3 Recorrer manualmente el flujo de edición y recálculo: recargar la app tras completar el
       cuestionario y comprobar que la página principal es el dashboard; editar cualidades y/o
       respuestas desde configuración; comprobar que se habilita el botón de recalcular; activarlo y
       verificar que el dashboard se refresca con nuevas comparaciones, y que las comparaciones de otros
       usuarios (seed) que lo tuvieran como candidato no se ven afectadas
- [ ] 20.4 Ejecutar toda la suite de tests (backend y frontend) y confirmar que queda en verde antes de
       dar la v1 por completa

## 21. Diseño responsive (transversal)

Estas tareas se ejecutan incrementalmente junto con cada pantalla de los grupos 11-17 (no como un
bloque aislado al final); se listan aparte solo para que el requisito de `responsive-ui` no se pierda
de vista pantalla por pantalla.

- [ ] 21.1 Test de componente: la cabecera (`core/shell`) colapsa a menú hamburguesa en viewport móvil
       (<768px) y mantiene el acceso a configuración y logout
- [ ] 21.2 Ajustar `core/shell` con las utilidades responsive de Bootstrap (`navbar-expand-*`) para que
       pase el test anterior
- [ ] 21.3 Test de componente: el stepper de `features/questionnaire` y los formularios de
       `features/registration`/`features/settings` no generan scroll horizontal en viewport móvil
- [ ] 21.4 Ajustar el grid/breakpoints de esos formularios con Bootstrap para que pase el test anterior
- [ ] 21.5 Test de componente: las tarjetas de `features/results-dashboard` se apilan en una sola
       columna en móvil (en vez de las 3 columnas de escritorio) y el radar chart se redimensiona al
       contenedor sin desbordar
- [ ] 21.6 Ajustar el grid de `features/results-dashboard` y la configuración de `ng2-charts`
       (`responsive: true`, `maintainAspectRatio`) para que pase el test anterior
- [ ] 21.7 Verificación manual cruzada en 3 anchos de viewport (móvil ~375px, tablet ~768px, escritorio
       ~1280px) sobre todas las pantallas antes de dar la v1 por completa
