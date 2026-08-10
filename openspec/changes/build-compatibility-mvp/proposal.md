## Why

Este proyecto es la base de un TFM: se necesita medir la compatibilidad entre dos perfiles usando un
LLM como "psicólogo de relaciones" que compara respuestas a un cuestionario de 36 preguntas de
compatibilidad, agregando el resultado en 6 dimensiones ponderadas. El objetivo es determinar afinidad
entre personas, no dictaminar si podrían enamorarse. En vez de un emparejamiento 1-a-1 por código, se
quiere comparar
a cada usuario contra un grupo más amplio ya registrado en BD, preseleccionando primero los 3 perfiles
más afines por cualidades personales compartidas para no disparar el análisis de IA (caro en tiempo y
en cuota del free tier) contra todo el pool. Hoy el repositorio está vacío: no existe backend, frontend,
base de datos ni datos de prueba, así que esta propuesta cubre la primera versión completa y funcional.

## What Changes

- Autenticación por email y contraseña (registro, login, logout y recuperación de contraseña por
  email), delegada en Supabase Auth: la contraseña queda hasheada en la misma base de datos Postgres
  del proyecto, sin implementar hashing/tokens de recuperación a mano.
- Alta de usuario en dos pasos: (1) email + contraseña (verificando que el email no exista ya) y (2),
  una vez autenticado, nombre, alias único, foto (subida a almacenamiento) y selección de 5 cualidades
  personales de un catálogo fijo de 15.
- Pantalla de configuración accesible desde la cabecera (botón de ajustes) para editar contraseña,
  nombre, alias, foto y cualidades; y botón de cierre de sesión, ambos en la esquina superior derecha
  de la interfaz autenticada.
- Formulario del cuestionario de 36 preguntas de compatibilidad, guardado como JSON con estructura
  prefijada.
- Selección automática de los 3 candidatos del pool con más cualidades coincidentes con el usuario
  (pre-compatibilidad), calculada una única vez al completar el cuestionario — sin recálculo
  retroactivo para usuarios ya existentes cuando se une gente nueva (evita una explosión de llamadas
  al LLM).
- Edición, desde la página de perfil, tanto de las respuestas del cuestionario como de las 5 cualidades
  elegidas; cualquiera de las dos ediciones habilita un botón de "recalcular compatibilidad" que vuelve
  a seleccionar candidatos y relanza el análisis solo para el propio usuario (sin afectar a otros
  usuarios que lo tuvieran como candidato).
- La página principal de la aplicación es el cuestionario mientras el usuario no lo haya completado
  nunca, y pasa a ser el dashboard de resultados una vez completado; el dashboard se refresca al
  ejecutar el recálculo.
- Orquestación de llamadas a un LLM (Groq, con OpenRouter como alternativa intercambiable) que compara,
  para cada uno de los 3 candidatos, las 36 respuestas por lotes de 6 preguntas, valida la salida contra
  el esquema JSON esperado, y calcula un resultado agregado con ponderación compuesta: dentro de cada
  dimensión (emocional, valores, estilo, intereses, madurez, apertura), las 36 preguntas se agrupan en 6
  bloques de 6 (mismo agrupamiento que los lotes de IA) con pesos incrementales por bloque (5%, 5%,
  15%, 20%, 25%, 30%); las 6 medias de dimensión resultantes se combinan después con los pesos de
  dimensión ya existentes (20/25/10/25/10/10) para dar la compatibilidad general.
- Dashboard de resultados con 3 tarjetas (una por candidato) mostrando foto, nombre, score final,
  gráfico radar de las 6 dimensiones y detalle expandible de las 36 preguntas comparadas.
- Interfaz completamente responsive (móvil, tablet, escritorio) con Bootstrap 5, ya que el acceso a la
  aplicación es exclusivamente web (no se plantea una app nativa/APK en esta v1).
- Semilla de datos: catálogo de 15 cualidades y 10 usuarios sintéticos (con fotos genéricas,
  cualidades y las 36 respuestas ya rellenadas) para poder probar la comparación sin depender de
  usuarios reales.
- Metodología de desarrollo TDD (test antes que implementación) y logging estructurado con IDs
  correlacionados en toda la orquestación de IA, para minimizar el tiempo de depuración ante fallos.

## Capabilities

### New Capabilities
- `authentication`: registro con email/contraseña (verificando email no duplicado), login, logout y
  recuperación de contraseña por email, delegados en Supabase Auth.
- `user-registration`: paso 2 del alta (requiere sesión autenticada): nombre, alias único, foto y
  selección de exactamente 5 de 15 cualidades personales, visualizadas como cards independientes que
  bloquean el envío hasta tener exactamente 5 marcadas.
- `user-settings`: pantalla de configuración (accesible desde botones de ajustes/logout en la cabecera)
  para editar contraseña, nombre, alias, foto y cualidades de un perfil ya existente.
- `personal-questionnaire`: formulario del cuestionario de 36 preguntas de compatibilidad y
  persistencia de las respuestas en la estructura JSON prefijada.
- `candidate-matching`: cálculo de pre-compatibilidad por cualidades compartidas y selección de los 3
  mejores candidatos del pool de usuarios con cuestionario completo.
- `ai-compatibility-analysis`: orquestación de llamadas al LLM por lotes de preguntas, validación del
  JSON de salida, reintentos/backoff, y cálculo del resultado agregado con ponderación compuesta
  (bloques de preguntas con peso incremental anidados en los pesos por dimensión).
- `results-dashboard`: visualización de las 3 comparaciones con foto, score, gráfico radar por
  dimensión y detalle por pregunta.
- `seed-data`: catálogo inicial de cualidades y pool de usuarios sintéticos precargados con fotos
  genéricas y cuestionarios completos.
- `responsive-ui`: adaptación completa de toda la interfaz a móvil, tablet y escritorio con Bootstrap 5,
  al no existir una app nativa y ser el acceso exclusivamente web.

### Modified Capabilities
(ninguna — no existen specs previas en `openspec/specs/`, el repositorio parte vacío)

## Impact

- Repositorio completo: monorepo nuevo con `apps/backend` (NestJS), `apps/frontend` (Angular),
  `packages/shared-types`, `supabase/migrations` y `supabase/seed`.
- Nueva base de datos PostgreSQL (Supabase) con tablas `users` (perfil, `id` = `auth.users.id`),
  `qualities`, `user_qualities`, `questionnaires`, `comparisons`, `comparison_question_results`,
  `comparison_aggregated_results`, un bucket de Storage `user-photos`, políticas de Row Level Security
  sobre `users`/`user_qualities`/`questionnaires` (cada usuario solo edita su propia fila), y Supabase
  Auth habilitado como proveedor de identidad (email/contraseña).
- Nueva dependencia externa: API Key de un proveedor de IA (Groq; OpenRouter opcional) consumida desde
  el backend. El envío de emails de recuperación de contraseña usa el SMTP incluido en el free tier de
  Supabase Auth (sin proveedor de email adicional).
- Fuera de alcance de esta v1 (documentado solo como líneas futuras): más idiomas, más de un set de
  preguntas, login social/OAuth, verificación de email obligatoria antes de continuar el registro,
  recálculo retroactivo de candidatos, y la migración a proveedores de pago / infraestructura de
  producción si el proyecto se comercializase.
