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
- Chat en tiempo real vía WebSockets, llamadas de voz/vídeo, chats grupales, indicador de "escribiendo…",
  edición/borrado de mensajes, notificaciones push y cifrado end-to-end del chat interno — la mensajería
  es texto simple actualizado por sondeo (ver decisión 9).

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
ajustes, logout, flecha de volver del wizard del cuestionario, etc.), en vez de escribir CSS a medida o
mezclar librerías de iconos distintas. Integración concreta: el paquete `bootstrap` (CSS) +
`bootstrap-icons` (fuente de iconos) más `@ng-bootstrap/ng-bootstrap` para los componentes interactivos
que sí lo necesitan (modales, dropdowns) reimplementados en Angular puro — evita depender del bundle JS
de Bootstrap (pensado para jQuery/vanilla) y sus conflictos con la detección de cambios de Angular. La
navegación por bloques y preguntas del cuestionario **no** usa `NgbAccordion`/`NgbNav` (ver 3c-quater
más abajo) — es un estado propio (`currentBlockIndex`/`currentQuestionIndex`), no un componente de
`ng-bootstrap`.
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

### 3c-quater. Marca "AfinIA", paleta de color, tipografía y cuestionario como wizard con gradiente de peso

El producto se llama **AfinIA** de cara al usuario (con logo propio); `compatibility-check-app` es solo
el nombre técnico del repo. La identidad visual tampoco es el azul/gris por defecto de Bootstrap: usa
una paleta propia (`#FB8500` Princeton Orange primario, `#BE1E2D` Carmine secundario/hover, `#000000`
texto/superficies oscuras, `#FDF0D5` Papaya Whip fondos suaves, `#FFFFFF` blanco base) y tipografía
**Poppins** (alternativas aceptadas: DM Sans o Roboto), aplicadas recompilando Bootstrap desde su fuente
Sass con las variables `$primary`/`$secondary`/`$dark`/`$light`/`$font-family-base` sobrescritas, en vez
de parchear clases sueltas con CSS a medida — así `.btn-primary`, `.bg-primary-subtle`, etc. se
recalculan solos. Al ser `$secondary` un rojo, se documenta explícitamente que no debe usarse para
botones "neutros" (`btn-outline-secondary`) como cancelar o cerrar sesión — esos usan `btn-outline-dark`,
porque un outline rojo se lee como acción destructiva. Los ejemplos oficiales de Bootstrap 5 (*Sign-in*,
*Dashboard*, *Album*) se usan como esqueleto de partida para cada shell/patrón ya descrito, no se
reinventan desde cero; el cuestionario ya no se basa en el ejemplo *Accordion* (ver el cambio siguiente).

**Rediseño sobre mockup (sustituye lo anterior en dos puntos transversales):**
- **El botón de acción principal de toda la app usa `btn-dark` (negro), no `btn-primary` (naranja)**: el
  naranja `$primary` deja de ser color de relleno de botón y queda reservado a acentos/estados
  seleccionados (píldoras de cualidad marcadas, burbuja propia del chat, insignias, degradado de fondo
  de Shell B). Es un cambio a toda la interfaz, no solo a las pantallas de autenticación.
- **Shell B (login, registro paso 1, forgot/reset password) pasa de una card centrada sobre fondo claro
  a un fondo degradado de marca a pantalla completa** (`linear-gradient(160deg, #FB8500, #BE1E2D)`), sin
  card de por medio — el logo (en blanco fijo, no `currentColor`) y el formulario flotan directamente
  sobre el degradado. Solo login añade el wordmark "AfinIA" bajo el logo; el resto muestra el título de
  esa pantalla concreta.

El cuestionario de 36 preguntas se presenta como un **wizard de 6 pasos** (uno por cada bloque de 6
preguntas ya usado en el cálculo ponderado, decisión 6c): **los 6 bloques nunca se muestran a la vez en
la misma pantalla**, solo el bloque activo, con una flecha para volver al bloque anterior. Esto sustituye
el planteamiento previo de un acordeón con los 6 paneles visibles simultáneamente (que a su vez había
sustituido al stepper lineal pregunta a pregunta original). La navegación entre bloques es libre (no
exige haber terminado el bloque actual); solo el envío final sigue exigiendo las 36 respuestas completas.
Además, **cualquier bloque ya visitado se puede volver a revisar y editar** — no solo retrocediendo un
paso con la flecha, también saltando directamente a él desde su segmento en la barra de progreso — sin
perder el sitio donde ibas: el estado distingue el bloque que se está viendo del bloque más avanzado
alcanzado, y un botón "Volver a donde estabas" te devuelve allí tras revisar.

Encima del bloque activo hay una **barra de progreso segmentada por peso**: 6 segmentos en línea con
ancho proporcional al peso del bloque (5/5/15/20/25/30%) que se rellenan con un gradiente que va de
blanco/crema (bloques de menor peso) a rojo/negro intenso (bloque de mayor peso) — un "semáforo" que
hace visible que las preguntas finales cuentan más en el resultado. El color se asigna por peso, no por
número de bloque: los bloques 1 y 2 pesan igual (5%) y deben verse idénticos. Esta barra sustituye tanto
al color de fondo de los 6 paneles del planteamiento anterior como a un simple contador "respondidas/36".

Dentro del bloque activo, las 6 preguntas **no se apilan verticalmente**: cada pregunta ocupa **toda la
pantalla**, una a la vez — ya no como pestañas `NgbNav` (rediseño sobre mockup), sino con una fila de
**puntos + flechas prev/next** debajo de la pregunta, con el mismo punto rellenándose cuando esa
pregunta ya está respondida, y clicable para saltar directo a ella (misma regla que los segmentos de la
barra de bloques: solo a preguntas ya visitadas). Cambiar de pregunta anima el contenido con una
transición corta (fade + desplazamiento horizontal, 200ms, `ease-out`, desactivada si el usuario
prefiere movimiento reducido) en vez de un salto brusco. Esto reduce la sensación de "formulario largo"
dentro de cada bloque sin volver a un stepper lineal para las 36 preguntas completas.

Todo esto está codificado como skill de Claude Code en `.claude/skills/ui-design-consistency/` (SKILL.md
+ `references/design-tokens.md` con los valores exactos, el logo y la tabla de gradientes +
`references/page-template.md` con el marcado de partida), para que la consistencia entre las 8 pantallas
no dependa de recordarlo manualmente en cada sesión de trabajo.

### 3d. Selección de cualidades como cards con mínimo y máximo de 5

Las 15 cualidades se presentan como **cards seleccionables** en grid (registro y configuración) — no
chips ni píldoras. Desmarcar es siempre libre, pero **marcar una sexta cualidad no está permitido**: en
cuanto la selección llega a 5, las cards no seleccionadas quedan deshabilitadas (sin poder pulsarlas)
hasta que se desmarca alguna de las 5 elegidas — el límite se hace cumplir en la propia interacción, no
solo al intentar enviar. El resto de campos del formulario (nombre, alias, foto) se pueden rellenar sin
que la selección de cualidades esté completa, y el **envío** del formulario (registro paso 2 o guardado
de configuración) sigue bloqueado mientras la selección no sea exactamente 5. La misma regla de
"exactamente 5" ya validada en backend (ver `user-registration`) se refuerza aquí en el cliente para dar
feedback inmediato, pero el backend sigue siendo la fuente de verdad (nunca confiar solo en la validación
de UI). Respecto al planteamiento original, además del límite de marcado descrito arriba, cambia el
**diseño del check de "seleccionada"**: una insignia circular superpuesta en la esquina de la card (con
la misma animación de entrada que la insignia de bloque del cuestionario) en vez de un icono de check
inline junto a la etiqueta.

### 3d-bis. Cualidades como píldoras (rediseño sobre mockup — sustituye el check de 3d)

Las 15 cualidades seleccionables siguen siendo un único componente compartido con exactamente las mismas
reglas de comportamiento de la decisión 3d (tope de 5 impuesto en la propia interacción, desmarcar
siempre libre, envío bloqueado si ≠5) — lo que cambia es solo la forma: en vez de cards en grid con una
insignia circular superpuesta, son **píldoras/chips** (`rounded-pill`) en una fila que envuelve. Sin
marcar: fondo gris claro, texto oscuro. Marcada: fondo `$primary` (naranja), texto blanco, sin icono
adicional — el propio cambio de color ya comunica la selección, sin duplicar el estado con una insignia.

### 3e. Completar perfil (registro paso 2) como wizard de 2 pasos, un único envío al final

Sobre el mockup, "completar perfil" (registro paso 2) se presenta como **2 pantallas** con paginación
por puntos (2 puntos), no un formulario único: paso 2a (foto + nombre completo + alias, con validación
en vivo de alias) y paso 2b (las 5 cualidades, ver 3d/3d-bis). Es una división puramente de **cliente**:
`POST /users/me/profile` sigue siendo una única llamada al backend con todos los campos juntos (no se
añade un endpoint intermedio ni se persiste nada al pasar de 2a a 2b) — el paso 2a solo valida y retiene
el estado del formulario en memoria hasta que el paso 2b termina y se envía todo junto. El botón de 2a se
llama "Siguiente" (avanza sin enviar nada); el de 2b, "Finalizar" (dispara el envío real).

### 3f. Pantalla de procesamiento: spinner + estado por candidato, sin porcentaje agregado

Mientras se resuelven las hasta 3 comparaciones (decisión 6), `features/processing` sondea
`GET /users/me/comparisons` y muestra un spinner (`spinner-border text-primary`) más una lista de los
candidatos ya seleccionados, cada uno con un icono de estado (pendiente/analizando, completado
`bi-check-circle-fill`, error `bi-exclamation-triangle`) — no una barra de "1 de 3" ni un porcentaje
agregado, porque el orden de finalización entre comparaciones no es predecible y un porcentaje sugeriría
una duración estimable que no existe. El polling se detiene en cuanto las comparaciones existentes están
todas en `completed`/`error`, y entonces navega al dashboard.

### 3g. Landing pública con animación de bienvenida, antes de Shell B

Se añade una **pantalla pública de aterrizaje** en `/` (marketing, no un formulario), que explica en qué
consiste AfinIA a quien todavía no tiene cuenta, con un único botón de llamada a la acción que navega a
`/auth/login`. Es una **tercera categoría de pantalla**, distinta de los dos shells ya descritos (no es
Shell A porque no hay sesión, y no es Shell B porque no contiene ningún formulario de autenticación) —
la excepción queda documentada aquí y en la skill en vez de forzarla dentro de una de las dos categorías
existentes.

**Comportamiento de ruta**: si quien visita `/` ya tiene una sesión activa, la pantalla no se muestra —
redirige de inmediato a la misma resolución ya usada para la ruta autenticada (cuestionario o dashboard
según `GET /users/me`, ver el guard de la sección 11 de `tasks.md`). Solo la ve tráfico sin sesión.

**Contenido y tono**: reutiliza la identidad visual ya establecida (degradado de marca, logo, tipografía
Poppins) para que la transición a Shell B se sienta continua, pero con un tratamiento editorial (una
frase que explica el producto en una línea, una segunda frase de apoyo, el botón de CTA) en vez del
formulario de Shell B. Copy real, sin lorem: explica que AfinIA compara cualidades y un cuestionario de
compatibilidad analizado por IA para encontrar afinidades reales entre personas — no vende nada que el
producto no haga.

**Animación**: al cargar, el logo se ensambla (sus 5 trazos aparecen con un fundido + escala breve y
escalonada, reutilizando el mismo lenguaje de entrada que las insignias del cuestionario) y el titular
más el botón entran con un fundido corto tras él — una única secuencia orquestada al cargar, no efectos
sueltos. El fondo degradado tiene un desplazamiento de gradiente lento y continuo (ambiental, no
protagonista). Todo respeta `prefers-reduced-motion`: sin movimiento, el contenido aparece completo de
inmediato y el degradado queda estático.

### 3h. Pantalla de bienvenida del cuestionario (solo en creación) y recálculo integrado en el guardado de edición

**Pantalla de bienvenida, solo la primera vez**: antes de entrar al wizard de 6 bloques, `features/questionnaire`
en **modo creación** muestra una única pantalla de transición — mismo fondo degradado que Shell B/landing,
título "Cuestionario de compatibilidad", una frase animando a responder con calma, y un botón "Iniciar" — en
vez de arrancar directamente en el bloque 1. En **modo edición** (entrado desde Configuración) esta pantalla
se omite: se navega directo al wizard ya prerellenado, porque la persona ya lo completó antes y no necesita
la ceremonia de bienvenida.

**Acceso desde Configuración es una navegación real, no una vista embebida**: el botón "Editar tus
respuestas" de `features/settings` navega a `features/questionnaire` en modo edición (misma ruta que el
cuestionario, con un modo distinto) — no despliega el wizard de 36 preguntas dentro de la propia pantalla de
configuración.

**El guardado de una edición ya recalcula, sin paso manual aparte**: en modo edición, el botón del
`card-footer` del bloque 6 no dice "Enviar cuestionario" (ese texto es solo de creación) sino **"Guardar y
recalcular compatibilidad"**. Al pulsarlo se encadenan, en una sola acción del usuario,
`PATCH /users/me/questionnaire` (guarda las respuestas editadas, marca `needs_recalculation = true`,
decisión 5c) y a continuación `POST /users/me/recalculate` (decisión 5b) — sin volver antes al dashboard a
pulsar un botón aparte. Al completarse ambas llamadas, navega al dashboard ya refrescado con las nuevas
comparaciones.

Esto **no elimina** el botón de recalcular del dashboard (decisión 5b sigue vigente): sigue siendo el punto
de recálculo para quien solo edita sus cualidades desde Configuración sin tocar el cuestionario, o para
quien prefiere posponer el recálculo tras guardar. Configuración, además, ofrece el mismo atajo justo
después de guardar cambios de perfil/cualidades: un botón "Recalcular compatibilidad ahora" junto a la
confirmación de guardado, que llama al mismo `POST /users/me/recalculate` sin obligar a navegar antes al
dashboard.

Completar el cuestionario **por primera vez** sigue disparando el análisis automáticamente vía
`QuestionnaireCompletedEvent` (decisión 5) — nunca ha necesitado un botón de recalcular, así que no hay
ambigüedad ahí: "recalcular" (manual o integrado en el guardado de edición) solo aplica a ediciones
posteriores a la primera vez.

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

### 9. Chat interno entre usuarios con compatibilidad, elegibilidad asimétrica y sin WebSockets

Tras generarse el dashboard, un usuario puede iniciar una conversación con cualquiera de sus candidatos
directamente desde la tarjeta de ese candidato. El acceso a **todas** sus conversaciones — tanto las que
él inició como las que otro usuario le inició a él — vive en un icono nuevo del menú de Shell A, situado
**a la izquierda del botón de Configuración** (orden final: chat, configuración, cerrar sesión).

**Modelo de datos** (dos tablas nuevas, sin relación con `comparisons`):
- `conversations` (`id`, `user_a_id`, `user_b_id` — FK a `users.id`, normalizados como
  `least(a,b)`/`greatest(a,b)` para poder poner `UNIQUE(user_a_id, user_b_id)` y no duplicar
  conversaciones entre el mismo par, `created_at`).
- `messages` (`id`, `conversation_id` FK, `sender_id` FK a `users.id`, `body` texto no vacío,
  `created_at`, `read_at` nullable).

**Elegibilidad para iniciar un chat es direccional, no simétrica** (igual que la selección de
candidatos de la decisión 5): un usuario A solo puede **iniciar** un chat con B si existe una fila en
`comparisons` con `requester_user_id = A` y `candidate_user_id = B` — es decir, B tiene que ser
literalmente uno de los candidatos que aparecen en el propio dashboard de A. No se exige la relación
inversa (que A sea también candidato de B): dos usuarios pueden tener compatibilidad calculada en un
solo sentido si el matching por cualidades no fue mutuo, y aun así A puede escribirle a B. Precisamente
por eso, B necesita acceder a esa conversación desde el **menú** (no tiene por qué tener una tarjeta de A
en su propio dashboard): el listado de conversaciones se construye a partir de `conversations` donde el
usuario es `user_a_id` o `user_b_id`, no a partir de sus propias `comparisons`.

**Las conversaciones sobreviven a un recálculo de compatibilidad**: la decisión 5b elimina y sustituye
las filas de `comparisons` de un usuario al recalcular, pero `conversations`/`messages` no tienen FK
a `comparisons` — si el candidato con el que ya se estaba chateando deja de ser uno de los 3 nuevos
candidatos, la conversación existente sigue intacta y accesible desde el menú (solo cambia de dónde
se podría re-iniciar una nueva, no de si la ya iniciada se conserva).

**Creación de conversación vía backend, no vía Supabase directo**: `POST /conversations` (esquema
`{ candidateUserId }`) valida la elegibilidad descrita arriba contra `comparisons` (consulta con
`service_role`, igual que hace `matching`) y crea la fila si no existe ya, o devuelve la existente
(idempotente) — el frontend nunca escribe en `conversations` directamente. El envío de mensajes
(`POST /conversations/:id/messages`) sí puede resolverse contra Supabase con RLS de por sí (el emisor
debe ser `user_a_id`/`user_b_id` de esa conversación), reforzado con políticas RLS como red de
seguridad de fondo, igual que el resto del dominio (nunca confiar solo en la validación de UI).

**Sin WebSockets, por sondeo (polling)**: como el resto de flujos "en vivo" de la app (`processing`, el
botón de recalcular), el chat se actualiza con sondeo REST en vez de una conexión persistente —
`GET /conversations/:id/messages?after=<cursor>` cada ~4s mientras una conversación está abierta, y un
sondeo más espaciado (~20-30s) para el contador de no leídos del icono del menú. Alternativa descartada:
un gateway WebSocket (`@nestjs/websockets`) — añadiría una dependencia de infraestructura con estado
(conexiones persistentes) sobre un despliegue de Render en el free tier, que ya duerme por inactividad
(cold start); el sondeo es coherente con el resto de la app y suficiente para una demo de TFM, a costa de
no ser mensajería instantánea (ver Risks).

Fuera de alcance explícito de esta decisión (ver Non-Goals): tiempo real vía WebSockets, llamadas,
chats grupales, indicador de "escribiendo…", edición/borrado de mensajes, notificaciones push y cifrado
end-to-end.

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
- **El chat por sondeo no es mensajería instantánea** (hasta ~4s de retraso en ver un mensaje nuevo) →
  Mitigación: aceptado explícitamente (decisión 9) por ser una demo de TFM sin infraestructura de
  WebSockets; documentar la limitación en la memoria si se compara con apps de mensajería reales.
- **Elegibilidad de chat asimétrica puede confundir en la demo** (A le escribe a B sin que B tenga a A
  como candidato propio) → Mitigación: el acceso a conversaciones vía el menú (no solo desde el
  dashboard) hace visible la conversación a B igualmente; documentar el comportamiento como
  intencionado, no como bug, si surge en la defensa del TFM.

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
