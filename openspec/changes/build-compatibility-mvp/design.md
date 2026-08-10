## Context

El repositorio está prácticamente vacío (solo `README.md` y un `.gitignore` de Angular CLI). No existe
backend, base de datos ni frontend. Esta es la primera implementación completa del sistema descrito en
`proposal.md`: comparación de compatibilidad vía LLM entre un usuario y los 3 candidatos más afines de
un pool, con preselección por cualidades personales compartidas.

## Goals / Non-Goals

**Goals:**
- Monorepo funcional con backend (NestJS), frontend (Angular), tipos compartidos y migraciones/seed de
  Supabase, desplegable en infraestructura 100% gratuita.
- Flujo completo: registro (nombre + foto + 5 cualidades) → cuestionario de 36 preguntas → selección
  automática de 3 candidatos → análisis IA por comparación → dashboard con resultados.
- Arquitectura desacoplada (interfaz de proveedor de IA, capa única de acceso a datos) que permita
  sustituir piezas (proveedor de IA, infraestructura de despliegue) sin reescribir el sistema.
- Desarrollo con TDD y logging estructurado desde el primer commit, no añadido después.
- Interfaz completamente responsive (móvil, tablet, escritorio), ya que el acceso es únicamente web.

**Non-Goals (fuera de alcance de esta v1):**
- App nativa / APK para móvil — el acceso es exclusivamente web responsive.
- Recálculo retroactivo de candidatos cuando se une gente nueva al pool.
- Login social/OAuth (Google, Facebook, etc.) — solo email/contraseña.
- Verificación obligatoria de email antes de poder continuar el registro (se prioriza no bloquear el
  flujo de la demo del TFM; queda como línea futura).
- Soporte multi-idioma, otros sets de preguntas, o comparación entre más de 2 personas a la vez.
- Migración a proveedores de pago o infraestructura de producción (documentada como línea futura, no
  implementada aquí).

## Decisions

### 1. Monorepo con npm workspaces (frontend Angular + backend NestJS + `shared-types`)

Un único repo evita que el contrato JSON de respuestas/resultados se desincronice entre frontend y
backend (DRY): ambos importan las mismas interfaces TypeScript de `packages/shared-types`. Alternativa
descartada: dos repos separados — habría exigido publicar un paquete npm privado solo para compartir
tipos, complejidad innecesaria para un TFM de un solo desarrollador.

### 2. NestJS sobre Express puro o un framework distinto

NestJS aporta módulos/decoradores/DI muy similares a ASP.NET Core, minimizando la curva de aprendizaje
desde el perfil .NET de la desarrolladora, y estructura el código en responsabilidad única por servicio
(SRP) de forma natural. Alternativa descartada: Express puro (más control pero exige imponer a mano la
estructura modular) y Python/FastAPI (curva de aprendizaje mayor sin beneficio claro para este dominio).

### 3b. Autenticación delegada en Supabase Auth, no implementada a mano

El registro exige email/contraseña con hasheo seguro y recuperación de contraseña por email. En vez de
implementar hashing (bcrypt/argon2), emisión de tokens de sesión y un servicio de envío de emails desde
cero, se delega todo en **Supabase Auth**, que ya forma parte del stack elegido (mismo proyecto que la
BD y el Storage): registra en `auth.users` con la contraseña hasheada en la misma base de datos
Postgres del proyecto, emite JWT de sesión, y expone `resetPasswordForEmail`/`updateUser` para el flujo
de "olvidé mi contraseña" usando el SMTP incluido en su free tier. El frontend Angular usa
`@supabase/supabase-js` directamente para signUp/signIn/signOut/reset de contraseña (patrón estándar de
Supabase); el backend NestJS solo necesita un guard que valide el JWT de Supabase en los endpoints
protegidos — no reimplementa nada de la lógica de autenticación. Alternativa descartada: auth propia con
bcrypt + JWT + proveedor de email transaccional (Resend/SendGrid) — añade una dependencia externa más y
bastante código de infraestructura (hashing, tokens de recuperación con expiración, plantillas de email)
sin aportar nada que Supabase Auth no resuelva ya gratis, contradiciendo el criterio de "acotado" del
TFM.

### 3c. Tabla de perfil `users` separada de la identidad (`auth.users`)

`users.id` es una foreign key 1:1 a `auth.users.id` (no se duplica email/contraseña en `users`). `users`
guarda solo lo que Supabase Auth no gestiona: `name` (nombre para mostrar en el propio perfil),
`alias` (identificador único elegido por el usuario, mostrado en las tarjetas de resultados y validado
tanto en cliente como con una restricción `UNIQUE` en BD), `photo_url` y `questionnaire_completed_at`.
Row Level Security (RLS) en `users`/`user_qualities`/`questionnaires` restringe la escritura a
`auth.uid() = id`; las lecturas cruzadas necesarias para el matching (comparar cualidades entre
usuarios) las hace el backend con la `service_role` key, nunca el cliente directamente — mantiene la
regla de "selección de candidatos solo la dispara el propio backend, una vez por usuario" (ver decisión
5 más abajo) y evita que un usuario pueda leer el pool completo desde el navegador.

### 3c-bis. Bootstrap 5 + Bootstrap Icons como sistema de diseño de la UI

Toda la interfaz Angular (layout general, formularios, botones, tarjetas de resultado, cabecera) usa
**Bootstrap 5** como sistema de diseño, y **Bootstrap Icons** para toda la iconografía (botón de
ajustes, logout, flechas del stepper, etc.), en vez de escribir CSS a medida o mezclar librerías de
iconos distintas. Integración concreta: el paquete `bootstrap` (CSS) + `bootstrap-icons` (fuente de
iconos) más `@ng-bootstrap/ng-bootstrap` para los componentes interactivos (modales, dropdowns,
acordeón del detalle de preguntas) reimplementados en Angular puro — evita depender del bundle JS de
Bootstrap (pensado para jQuery/vanilla) y sus conflictos con la detección de cambios de Angular.
`ng2-charts`/Chart.js se mantiene aparte solo para el gráfico radar (Bootstrap no cubre gráficas), pero
se integra visualmente dentro de tarjetas Bootstrap.

La skill de Claude Code `.claude/skills/ui-design-consistency/` traduce esta decisión (y las 3c-ter y
3d) en un checklist concreto y una plantilla de partida para cada pantalla, de forma que la consistencia
entre las 8 pantallas del frontend no dependa de recordarlo manualmente en cada sesión de trabajo.

### 3c-ter. Diseño completamente responsive (mobile-first, solo acceso web)

No se plantea una app nativa/APK en esta v1 — todo el acceso es web, incluido desde móvil. La interfaz
SHALL ser completamente responsive en las tres franjas estándar de Bootstrap (móvil <768px, tablet
768–991px, escritorio ≥992px), usando el grid y las utilidades responsive de Bootstrap 5 ya adoptado
(decisión 3c-bis) en vez de media queries a medida. Implicaciones concretas por pantalla: la cabecera
colapsa a menú hamburguesa en móvil; el stepper del cuestionario y los formularios ocupan el ancho
disponible sin scroll horizontal; las tarjetas del dashboard pasan de 3 columnas en escritorio a 1
columna apilada en móvil; los gráficos radar (`ng2-charts`) se redimensionan al contenedor en vez de
tener un tamaño fijo en píxeles.

### 3c-quater. Paleta de color, tipografía y cuestionario en 6 paneles con gradiente de peso

La identidad visual del proyecto no es el azul/gris por defecto de Bootstrap: usa una paleta propia
(`#E67E22` primario, `#D35400` secundario/hover, `#0D1B2A` texto/superficies oscuras, `#FCF3CF` fondos
suaves) y tipografía **Poppins** (alternativas aceptadas: DM Sans o Roboto), aplicadas recompilando
Bootstrap desde su fuente Sass con las variables `$primary`/`$secondary`/`$dark`/`$light`/
`$font-family-base` sobrescritas, en vez de parchear clases sueltas con CSS a medida — así
`.btn-primary`, `.bg-primary-subtle`, etc. se recalculan solos. Los ejemplos oficiales de Bootstrap 5
(*Sign-in*, *Dashboard*, *Album*, *Accordion*) se usan como esqueleto de partida para cada shell/patrón
ya descrito, no se reinventan desde cero.

El cuestionario de 36 preguntas se reorganiza en **6 paneles colapsables** (uno por cada bloque de 6
preguntas ya usado en el cálculo ponderado, decisión 6c), con un fondo en gradiente que va de verde
(bloques de menor peso, 5%) a naranja/rojo intenso (bloque de mayor peso, 30%) — un "semáforo" que hace
visible al usuario que las preguntas finales cuentan más en el resultado. El color se asigna por peso,
no por número de bloque: los bloques 1 y 2 pesan igual (5%) y deben verse idénticos. Esto sustituye el
planteamiento inicial de "stepper lineal" para el cuestionario.

Dentro de cada panel, las 6 preguntas del bloque **no se apilan verticalmente**: se presentan como
**pestañas** (`NgbNav`), mostrando una pregunta a la vez, con un icono por pestaña que indica si esa
pregunta ya está respondida. Cambiar de pestaña anima el contenido con una transición corta (fade +
desplazamiento horizontal, 200ms, `ease-out`, desactivada si el usuario prefiere movimiento reducido) en
vez de un salto brusco. Esto reduce la sensación de "formulario largo" dentro de cada bloque sin volver
a un stepper lineal para las 36 preguntas completas — el stepper se descarta a nivel de cuestionario,
pero una navegación por pestañas sí tiene sentido a nivel de bloque (6 elementos, no 36).

Todo esto está codificado como skill de Claude Code en `.claude/skills/ui-design-consistency/` (SKILL.md
+ `references/design-tokens.md` con los valores exactos y la tabla de gradientes + `references/page-template.md`
con el marcado de partida), para que la consistencia entre las 8 pantallas no dependa de recordarlo
manualmente en cada sesión de trabajo.

### 3d. Selección de cualidades como cards con mínimo y máximo de 5

Las 15 cualidades se presentan como cards seleccionables (registro y configuración). La UI permite
marcar/desmarcar libremente, pero solo bloquea el **envío** del formulario (registro paso 2 o guardado
de configuración) mientras la selección no sea exactamente 5 — el resto de campos del formulario
(nombre, alias, foto) se pueden rellenar sin que la selección de cualidades esté completa. La misma
regla de "exactamente 5" ya validada en backend (ver `user-registration`) se refuerza aquí en el
cliente para dar feedback inmediato, pero el backend sigue siendo la fuente de verdad (nunca confiar
solo en la validación de UI).

### 3. PostgreSQL/Supabase con columnas JSONB, en vez de una base NoSQL

Las respuestas y resultados de IA encajan en la "estructura prefijada" pedida usando `jsonb`, pero el
resto del dominio (usuarios, cualidades, comparaciones) es claramente relacional (relaciones muchos-a-
muchos, agregados, joins para el cálculo de pre-compatibilidad). PostgreSQL cubre ambos casos con un
único motor, y es transferible desde el conocimiento previo de SQL Server. Alternativa descartada:
MongoDB — habría exigido modelar a mano relaciones que Postgres resuelve con claves foráneas e índices.

### 4. Interfaz `AiProvider` desacoplada del backend (Groq como implementación por defecto)

`ai-orchestrator.service.ts` depende de una interfaz (`ai-provider.interface.ts`), no de Groq
directamente; `groq.provider.ts` y `openrouter.provider.ts` la implementan (inversión de dependencias,
principio abierto/cerrado). Esto permite añadir un proveedor de pago (p. ej. Anthropic Claude) en el
futuro sin tocar el orquestador — ver `proposal.md`/plan técnico para la ruta de migración a producción.

### 5. Selección de candidatos por cualidades compartidas, calculada una única vez por usuario

Al completar su cuestionario, el usuario dispara un cálculo SQL (`count` de cualidades coincidentes,
`order by ... limit 3`) contra los usuarios con cuestionario ya completo, y crea 3 filas `comparisons`.
Esta selección **no se recalcula retroactivamente** para usuarios existentes cuando se une gente nueva:
hacerlo convertiría el coste de llamadas al LLM de O(1) por alta (18 llamadas: 3 comparaciones × 6
lotes) a O(N) por alta (con 20 usuarios en el pool, hasta 360 llamadas adicionales por una sola
incorporación), agotando el rate limit y la cuota diaria del free tier de Groq durante una demo. Si en
el futuro se quiere "descubrimiento retroactivo", debe ser una acción explícita bajo demanda del
usuario, reutilizando comparaciones ya calculadas entre el mismo par antes de invocar de nuevo al LLM.

### 5b. Recálculo manual bajo demanda (excepción controlada a la regla de cálculo único)

La regla de "cálculo único, sin recálculo retroactivo" (decisión 5) sigue protegiendo contra la
explosión O(N) de llamadas al LLM, pero admite una excepción explícita y acotada: el propio usuario
puede forzar el recálculo de **sus propias** comparaciones tras editar sus respuestas del cuestionario o
su selección de cualidades. Esto sigue siendo O(1) por acción (18 llamadas como máximo, igual que el
cálculo inicial) porque el efecto se limita al usuario que pulsa el botón — nunca se propaga a otros
usuarios que lo tuvieran como candidato (ver el nuevo escenario en `candidate-matching`).

Implementación: un flag `users.needs_recalculation` (booleano) se activa al editar respuestas o
cualidades, y se muestra en el frontend como el habilitador del botón "recalcular compatibilidad" en el
dashboard. Al activarse el botón, se despacha `RecalculateCompatibilityCommand`, cuyo handler reutiliza
la misma lógica de `candidate-selector.service.ts` que el alta inicial (puede seleccionar candidatos
distintos si las cualidades cambiaron), **elimina las comparaciones anteriores del usuario** (con
cascada sobre sus resultados por pregunta y su agregado, ya prevista en el esquema) y publica de nuevo
`ComparisonsCreatedEvent` para que el mismo handler de `ai` dispare el análisis — sin duplicar lógica
entre el flujo inicial y el de recálculo. Al terminar, se desmarca `needs_recalculation`.

No se conserva histórico de comparaciones anteriores en v1 (se sustituyen, no se archivan) para no
añadir complejidad de versionado al esquema; queda como posible línea futura si se quisiera mostrar
"cómo ha cambiado tu compatibilidad con el tiempo".

### 6. Batching de 6 preguntas por llamada al LLM, con validación Zod y reintentos

36 preguntas por comparación en llamadas individuales (36 llamadas) sería inviable en el free tier de
Groq por rate limit y overhead de repetir el prompt de sistema. Agrupar en 6 lotes de 6 preguntas reduce
a 6 llamadas por comparación (18 por usuario nuevo). Cada respuesta se valida contra un esquema Zod
(claves exactas, valores 1.00–10.00 con dos decimales); si falla, se reintenta con backoff (máx. 3
intentos) reenviando el lote con instrucción de corrección; si sigue fallando, la comparación pasa a
`status = 'error'` para reintento manual.

### 5c. Borrador del cuestionario persistido en BD, no en `localStorage`

El progreso del cuestionario deja de depender de `localStorage` (que se pierde al cambiar de
dispositivo/navegador o al limpiar datos) y pasa a guardarse en el propio backend: un endpoint de
guardado de borrador (`PUT /users/me/questionnaire/draft`) acepta entre 0 y 36 respuestas en cualquier
momento, sin exigir el conjunto completo y sin disparar `CompleteQuestionnaireCommand` ni el resto del
pipeline de matching/IA. Un endpoint de lectura (`GET /users/me/questionnaire`) devuelve lo guardado
hasta el momento para prerellenar el formulario, incluida una sesión nueva tras volver a iniciar sesión.

El guardado de borrador se implementa como un servicio NestJS normal, no como un Command adicional: a
diferencia de `CompleteQuestionnaireCommand` (que publica `QuestionnaireCompletedEvent` y desencadena
todo el pipeline), el borrador no tiene ningún efecto de dominio que desacoplar de otros módulos — es
una escritura frecuente y de bajo riesgo, y forzarla a pasar por el `CommandBus` solo añadiría ceremonia
sin beneficio, en línea con el criterio "selectivo" ya adoptado para CQRS (decisión 6b).

El endpoint de envío final (`POST /users/me/questionnaire`, ya existente) sigue siendo el único que
exige las 36 respuestas completas, marca `questionnaire_completed_at` y dispara el evento — el borrador
y el envío final son operaciones distintas con validaciones distintas, no la misma operación con un
parámetro opcional.

### 5d. Las respuestas de otros usuarios nunca se exponen en el dashboard

El JSON original pedido para el análisis de IA (`pregunta, id_usuario_1, respuesta_usuario_1,
id_usuario_2, respuesta_usuario_2, compatibilidad, emocional, ...`) sigue siendo lo que el backend
almacena en `comparison_question_results.result` — es el registro completo necesario para auditar el
análisis y para construir el prompt. Pero ese registro completo **no es lo que se expone a través de la
API que consume el dashboard**: `GET /comparisons/:id/detail` filtra `respuesta_usuario_1` y
`respuesta_usuario_2` antes de devolver la respuesta, dejando solo `pregunta`, las 6 puntuaciones por
dimensión, `compatibilidad` y `explicación`. El dashboard nunca muestra el texto de ninguna respuesta —
ni la propia ni la del candidato —, solo las puntuaciones y, de forma opcional (no visible por defecto),
la justificación de la IA por pregunta.

Esto es deliberado por dos motivos: (1) las respuestas a un cuestionario de compatibilidad son
información personal e íntima que un usuario comparte para ser evaluado, no para ser leído por
desconocidos del pool; y (2) reduce la superficie de datos sensibles expuesta por la API, en línea con
el principio de minimización de datos ya mencionado como riesgo en la sección de Riesgos/Trade-offs.
El filtrado se hace en el propio endpoint (capa de aplicación), no confiando en que el frontend
simplemente "no muestre" el campo — un cliente API directo tampoco debe poder leerlo.

### 6c. Ponderación compuesta: bloques de preguntas (peso incremental) anidados en los pesos por dimensión

La compatibilidad general (`compatibilidad_final`) no se calcula ya como una media simple de cada
dimensión sobre las 36 preguntas: las 36 preguntas se agrupan en **6 bloques de 6 preguntas cada uno,
en el mismo orden que los lotes usados para las llamadas al LLM** (decisión 6) — bloque 1 = preguntas
1–6, bloque 2 = preguntas 7–12, ..., bloque 6 = preguntas 31–36 —, con pesos incrementales por bloque:
5%, 5%, 15%, 20%, 25%, 30% (reflejando que las preguntas finales del cuestionario son más reveladoras).

Fórmula de dos niveles, calculada en `weighting.util.ts` (función pura):

1. Para cada una de las 6 dimensiones, la media de esa dimensión **ya no es una media simple sobre 36
   preguntas**, sino una media ponderada por bloque: se promedian las 6 preguntas de cada bloque, y esos
   6 promedios de bloque se combinan con los pesos de bloque (5/5/15/20/25/30%).
2. Las 6 medias de dimensión resultantes (ya ponderadas por bloque) se combinan con los pesos de
   dimensión existentes (emocional 20%, valores 25%, estilo 10%, intereses 25%, madurez 10%, apertura
   10%) para obtener `compatibilidad_final`.

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
```

El campo `compatibilidad` por pregunta (informativo) sigue sin participar en este cálculo — solo se usa
para el detalle expandible de cada pregunta, tal como se decidió originalmente. `weights` en
`comparison_aggregated_results` guarda ambos vectores de pesos (`dimension` y `block`) para que el
cálculo quede auditable en la memoria del TFM. Esta alineación entre "bloque de ponderación" y "lote de
llamada a la IA" es deliberada: reutiliza la misma agrupación de 6 preguntas para dos propósitos (rate
limiting y ponderación), sin introducir un segundo concepto de agrupación en el dominio.

### 7. Independencia de infraestructura y funciones puras (persistence ignorance)

La lógica de dominio (`candidate-selector.service.ts`, `weighting.util.ts`, validación del esquema del
LLM) no llama directamente al cliente de Supabase; pasa por `supabase.service.ts` como única puerta de
acceso a datos. `weighting.util.ts` es una función pura (array de resultados por pregunta + pesos →
objeto agregado), sin efectos secundarios, lo que permite testearla con datos en memoria sin BD real —
requisito directo de la metodología TDD adoptada para este proyecto.

### 6b. Mediator/CQRS selectivo (`@nestjs/cqrs`) para desacoplar el flujo y centralizar el logging

Se adopta `@nestjs/cqrs` (equivalente NestJS de MediatR) de forma **selectiva**, no como patrón
uniforme para todos los endpoints:

- **Commands** para operaciones de escritura con efectos relevantes: `CreateUserProfileCommand`,
  `CompleteQuestionnaireCommand`, `AnalyzeComparisonCommand`, `RecalculateCompatibilityCommand` (ver
  decisión 5b). Cada una con su propio Handler, testeado de forma aislada (TDD) sin arrastrar el resto
  del pipeline.
- **Events** para encadenar módulos sin acoplarlos: `questionnaires` publica
  `QuestionnaireCompletedEvent` tras persistir el cuestionario, sin conocer la existencia de
  `matching`; el handler de `matching` reacciona a ese evento, calcula los candidatos y, si crea
  comparaciones, publica `ComparisonsCreatedEvent`; el handler de `ai` reacciona a ese evento
  disparando la orquestación para cada comparación. Esto sustituye las llamadas directas
  servicio-a-servicio previstas inicialmente entre `questionnaires` → `matching` → `ai`, reforzando el
  principio abierto/cerrado ya aplicado a los proveedores de IA: añadir un futuro listener (por
  ejemplo, una notificación) no exige tocar `questionnaires` ni `matching`.
- **Un único pipeline de logging** enganchado al `CommandBus` (interceptor) registra automáticamente el
  inicio, fin y resultado de cada Command con su identificador de correlación, en vez de repetir
  logging manual en cada servicio — esto es precisamente lo que exige la metodología de logging
  estructurado adoptada para el proyecto.
- **Las lecturas simples NO se convierten en Queries**: `GET /qualities`, `GET /users/me`,
  `GET /users/me/comparisons`, `GET /comparisons/:id/detail` siguen siendo servicios NestJS normales.
  Formalizar cada lectura trivial como `Query` + `QueryHandler` añadiría archivos y capas sin
  beneficio real para un proyecto del tamaño de este TFM — se reserva CQRS para donde aporta
  desacoplamiento o centraliza una responsabilidad transversal (logging), no como dogma.

### 7b. Cambio de contraseña con reautenticación explícita

La pantalla de configuración pide la contraseña actual además de la nueva antes de invocar
`supabase.auth.updateUser({password})`: el frontend primero reintenta `signInWithPassword` con la
contraseña actual introducida para confirmarla, y solo si es correcta procede a actualizarla. Es una
capa de seguridad extra frente a que alguien con una sesión abierta sin vigilancia cambie la contraseña
sin conocerla.

### 8. Metodología TDD y logging estructurado (aplica a todas las capacidades)

- **TDD**: ciclo rojo-verde-refactor por unidad de trabajo. Funciones puras (`weighting.util.ts`,
  cálculo de pre-compatibilidad) se testean primero sin mocks con tablas de casos (caso feliz, empates,
  menos de 3 candidatos disponibles, valores en los límites 1.00/10.00). Servicios con dependencias
  externas (`ai-orchestrator.service.ts`, `photo-upload.service.ts`) se testean primero contra una
  interfaz/mock, cubriendo explícitamente los casos de error (JSON inválido del LLM, timeout/429,
  fallo de subida de foto). Endpoints con tests e2e (`supertest`) antes de implementarlos. Ninguna
  tarea de `tasks.md` se marca completa sin su test en verde.
- **Logging estructurado**: logger único por app con niveles y contexto por módulo (nunca
  `console.log` suelto). Puntos de log obligatorios en el flujo de IA: envío de cada lote
  (`comparison_id`, `question_ids`, proveedor, nº intento), recepción de respuesta (duración), fallo de
  validación Zod (motivo, no el contenido íntegro) y cada reintento/backoff. El mismo `comparison_id`/
  `user_id` se propaga en todos los logs de una operación para poder reconstruir un fallo completo sin
  cruzar logs a ciegas. **Nunca se loguea el contenido íntegro de las 36 respuestas de un usuario** en
  texto plano (dato sensible) — solo longitudes, IDs y metadatos.

## Risks / Trade-offs

- **Rate limits del free tier de Groq** → Mitigación: batching (6 llamadas/comparación), concurrencia
  limitada, backoff exponencial con reintentos acotados, y la regla de "cálculo único por usuario" del
  punto 5.
- **Cold-start de Render (free tier)** → Mitigación: pantalla de carga explicativa en el frontend
  durante el polling inicial; documentar la limitación en la memoria del TFM.
- **Salida no determinista del LLM** (mismo par de respuestas puede puntuar distinto entre ejecuciones)
  → Mitigación: ninguna técnica (limitación aceptada); documentar en la memoria como característica
  conocida del enfoque basado en LLM.
- **El score de compatibilidad no tiene validez clínica** → Mitigación: disclaimer explícito en el
  dashboard.
- **Fotos de usuario como dato sensible** → Mitigación: usuarios seed con fotos genéricas (no rostros
  reales); si hay demo pública, usar solo cuentas de prueba propias.
- **Pool pequeño de usuarios → candidatos repetidos** → Mitigación: seed ampliado a 8–12 perfiles
  variados en `seed-data`.
- **Límites de envío de email del free tier de Supabase Auth** (rate limit bajo para emails
  transaccionales) → Mitigación: documentar el límite en la memoria; suficiente para una demo con pocos
  usuarios de prueba, no para producción real.
- **RLS mal configurada expondría perfiles de otros usuarios** → Mitigación: escribir tests de
  integración específicos que verifiquen que un usuario autenticado no puede leer/editar la fila de
  `users`/`questionnaires` de otro usuario vía el cliente directo de Supabase.
- **Usuarios seed necesitan una fila real en `auth.users`** (porque `users.id` es FK a `auth.users.id`)
  → Mitigación: el script de seed crea también los usuarios de Auth vía la Admin API de Supabase
  (`service_role` key) con contraseñas aleatorias que nunca se comunican (no necesitan iniciar sesión
  para la demo).

## Migration Plan

No aplica migración de datos (proyecto nuevo). Pasos de puesta en marcha:
1. Crear proyecto Supabase, ejecutar `supabase/migrations/0001_init.sql`, crear bucket `user-photos`.
2. Ejecutar `supabase/seed/seed.ts` para poblar `qualities` y los 10 usuarios sintéticos.
3. Desplegar backend en Render y frontend en Vercel/Netlify apuntando al backend.
4. Verificar el flujo completo end-to-end contra las URLs públicas (ver `tasks.md` para el detalle).

Rollback: al no haber datos de producción previos, el rollback es simplemente no promocionar el
despliegue (Render/Vercel permiten mantener el deploy anterior activo mientras se corrige uno nuevo).

## Open Questions

- Si el volumen de usuarios reales crece antes de terminar el TFM, decidir si el seed de 10 perfiles
  sigue siendo suficiente para que el filtro de pre-compatibilidad no devuelva siempre los mismos 3
  candidatos.

## Catálogo de cualidades (confirmado)

Empatía, humor, ambición, creatividad, honestidad, aventura, estabilidad, curiosidad, generosidad,
paciencia, sociabilidad, independencia, sensibilidad, disciplina, espontaneidad — 15 cualidades fijas
para v1, usadas tanto en el formulario de registro como en el seed de usuarios sintéticos.
