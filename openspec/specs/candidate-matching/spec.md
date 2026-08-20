# Candidate Matching

## Purpose

Calcula, para cada usuario, sus hasta 3 candidatos más afines por cualidades personales compartidas
— una única vez, en el momento en que el propio usuario completa su cuestionario, sin recálculo
retroactivo para otros usuarios ya existentes — y admite una excepción explícita y acotada: el propio
usuario puede recalcular sus propias comparaciones bajo demanda tras editar sus respuestas o
cualidades, sin propagar ese efecto a nadie más.

## Requirements

### Requirement: Selección de los 3 candidatos más afines por cualidades compartidas
El sistema SHALL, al completar un usuario su cuestionario, seleccionar hasta 3 candidatos de entre los
usuarios con cuestionario ya completo, ordenados por número de cualidades coincidentes con las 5
elegidas por el usuario.

#### Scenario: Selección con suficientes candidatos disponibles
- **WHEN** un usuario completa su cuestionario y existen 3 o más usuarios con cuestionario completo
- **THEN** el sistema crea 3 registros de comparación con los 3 usuarios que más cualidades comparten
  con el usuario, registrando el número de cualidades coincidentes de cada uno

#### Scenario: Empate en número de cualidades coincidentes
- **WHEN** varios candidatos comparten el mismo número de cualidades coincidentes con el usuario y
  compiten por la última posición entre los 3 seleccionados
- **THEN** el sistema desempata eligiendo primero al candidato cuyo cuestionario se completó antes

#### Scenario: Menos de 3 candidatos disponibles
- **WHEN** un usuario completa su cuestionario y existen menos de 3 usuarios con cuestionario completo
- **THEN** el sistema crea una comparación por cada candidato disponible (0, 1 o 2) sin fallar

#### Scenario: Ningún candidato disponible
- **WHEN** un usuario completa su cuestionario y no existe ningún otro usuario con cuestionario completo
- **THEN** el sistema no crea ninguna comparación y el usuario queda a la espera de futuros candidatos

### Requirement: Cálculo único automático, sin recálculo retroactivo para otros usuarios
El sistema SHALL calcular los candidatos de un usuario automáticamente una única vez, en el momento en
que ese propio usuario completa su cuestionario por primera vez, y NUNCA SHALL recalcular
retroactivamente las comparaciones de OTROS usuarios ya existentes, ni cuando se incorpora un usuario
nuevo al pool ni cuando un usuario edita sus propias respuestas o cualidades.

#### Scenario: Alta de un usuario nuevo no afecta a comparaciones existentes
- **WHEN** un usuario nuevo completa su cuestionario y pasa a estar disponible como candidato
- **THEN** las comparaciones y candidatos ya calculados para usuarios existentes permanecen sin cambios,
  y no se generan llamadas adicionales al LLM para esos usuarios existentes

#### Scenario: La edición de un usuario no afecta a quienes lo eligieron como candidato
- **WHEN** un usuario edita sus respuestas del cuestionario o su selección de cualidades
- **THEN** las comparaciones ya calculadas por otros usuarios que lo incluyeron como candidato
  permanecen sin cambios, y no se generan llamadas adicionales al LLM para esos otros usuarios

### Requirement: Recálculo manual de las propias comparaciones
El sistema SHALL habilitar, solo para el propio usuario y solo tras editar sus respuestas del
cuestionario o su selección de cualidades, una acción explícita de "recalcular compatibilidad" que
vuelva a seleccionar sus candidatos y relance el análisis de IA correspondiente, sustituyendo sus
comparaciones anteriores.

#### Scenario: La edición habilita el recálculo
- **WHEN** un usuario edita sus respuestas del cuestionario o cambia su selección de cualidades desde su
  página de perfil
- **THEN** el sistema marca su perfil como pendiente de recalcular y la interfaz habilita el botón de
  "recalcular compatibilidad"

#### Scenario: Ejecución del recálculo
- **WHEN** el usuario, con su perfil marcado como pendiente de recalcular, activa el botón de recalcular
  compatibilidad
- **THEN** el sistema vuelve a seleccionar sus hasta 3 candidatos según sus cualidades actuales, sustituye
  sus comparaciones anteriores por unas nuevas en estado `pending`, dispara de nuevo el análisis de IA
  para ellas, y desmarca el perfil como pendiente de recalcular

#### Scenario: Sin cambios no hay recálculo disponible
- **WHEN** un usuario no ha editado ni sus respuestas ni sus cualidades desde su último cálculo
- **THEN** el botón de recalcular compatibilidad permanece deshabilitado y el sistema rechaza cualquier
  intento directo de invocar el recálculo

#### Scenario: Editar y guardar el cuestionario recalcula en la misma acción
- **WHEN** un usuario edita sus respuestas del cuestionario desde el modo edición (ver
  `personal-questionnaire`/`user-settings`) y guarda los cambios
- **THEN** el sistema encadena, como parte de esa misma acción del usuario, la sustitución de las
  respuestas y el recálculo descrito en el escenario "Ejecución del recálculo" — sin exigir que el
  usuario active un control de recalcular por separado después de guardar. "Encadena" es una garantía
  de **experiencia de usuario** (un único clic, sin volver a buscar un botón aparte), no de atomicidad
  de backend: la implementación real es el cliente disparando dos llamadas HTTP consecutivas
  (`PATCH` seguido de `POST /recalculate`), no una única operación transaccional — ver `design.md`
  decisión 3h para el detalle exacto

#### Scenario: Editar solo cualidades sigue exigiendo activar el recálculo por separado
- **WHEN** un usuario cambia únicamente su selección de cualidades (sin tocar el cuestionario) desde
  configuración
- **THEN** el sistema marca el perfil como pendiente de recalcular y espera a que el usuario active
  explícitamente el recálculo desde el atajo de configuración (único punto de entrada de esta acción
  en la interfaz — ver `user-settings`/`results-dashboard`) — guardar el cambio de cualidades no
  recalcula por sí solo

### Requirement: La pre-compatibilidad por cualidades no participa en el cálculo ponderado final
El sistema SHALL usar el número de cualidades coincidentes únicamente como criterio de selección de
candidatos, sin incluirlo en el cálculo del resultado final ponderado por dimensiones.

#### Scenario: El resultado final se basa solo en las respuestas comparadas
- **WHEN** se calcula el resultado agregado de una comparación
- **THEN** el valor de `compatibilidad_final` depende exclusivamente de las puntuaciones por dimensión
  obtenidas al comparar las 36 respuestas, no del número de cualidades coincidentes que originó la
  selección del candidato
