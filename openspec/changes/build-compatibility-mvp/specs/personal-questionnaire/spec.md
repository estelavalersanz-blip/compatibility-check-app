## ADDED Requirements

### Requirement: Cumplimentación del cuestionario de las 36 preguntas de compatibilidad
El sistema SHALL permitir a un usuario registrado enviar, exactamente una vez, sus respuestas al
cuestionario de 36 preguntas usado para medir compatibilidad entre personas.

#### Scenario: Envío completo de las 36 respuestas
- **WHEN** un usuario registrado envía una respuesta para cada una de las 36 preguntas
- **THEN** el sistema guarda el cuestionario, marca al usuario como disponible para ser candidato de
  otros usuarios, y dispara el cálculo de sus propios candidatos

#### Scenario: Envío incompleto
- **WHEN** un usuario envía un cuestionario con menos de 36 respuestas o con alguna pregunta sin
  identificar
- **THEN** el sistema rechaza la petición con un error de validación y no persiste el cuestionario

#### Scenario: Reenvío de un cuestionario ya completado por la vía de alta inicial
- **WHEN** un usuario que ya tiene un cuestionario guardado intenta enviarlo de nuevo por el mismo canal
  de envío inicial (no por la edición desde su perfil)
- **THEN** el sistema rechaza la petición, indicando que el cuestionario ya fue completado y que debe
  editarse desde su página de perfil

### Requirement: Guardado de respuestas parciales (borrador) antes de completar el cuestionario
El sistema SHALL permitir a un usuario guardar en cualquier momento las respuestas que lleve
respondidas, aunque sean menos de 36, sin que ese guardado dispare el análisis de compatibilidad ni
marque el cuestionario como completado. El sistema SHALL cargar automáticamente las respuestas ya
guardadas (completas o parciales) cada vez que el usuario acceda a su cuestionario, incluida una nueva
sesión tras iniciar sesión de nuevo, para que no tenga que volver a escribirlas.

#### Scenario: Guardado de un borrador incompleto
- **WHEN** un usuario guarda su progreso con, por ejemplo, 10 de las 36 respuestas rellenadas
- **THEN** el sistema persiste esas 10 respuestas sin marcar el cuestionario como completado y sin
  disparar el cálculo de candidatos ni el análisis de IA

#### Scenario: Carga del borrador al iniciar sesión
- **WHEN** un usuario con un borrador guardado (parcial o completo) inicia sesión y abre el cuestionario
- **THEN** el sistema le muestra sus respuestas ya guardadas, prerellenadas en los paneles
  correspondientes, sin que tenga que volver a escribirlas

#### Scenario: Un borrador nunca dispara el análisis
- **WHEN** se guarda un borrador con cualquier número de respuestas entre 0 y 35
- **THEN** el usuario permanece sin cuestionario completado (no disponible como candidato para otros
  usuarios) hasta que envíe explícitamente las 36 respuestas completas

### Requirement: Envío bloqueado hasta completar las 36 respuestas
El sistema SHALL mantener deshabilitada la acción de enviar el cuestionario a analizar mientras no
existan respuestas para las 36 preguntas, independientemente de cuántas se hayan guardado como
borrador.

#### Scenario: Botón de envío deshabilitado con respuestas incompletas
- **WHEN** el usuario tiene guardadas menos de 36 respuestas (borrador parcial)
- **THEN** el control de envío del cuestionario permanece deshabilitado

#### Scenario: Botón de envío habilitado con las 36 respuestas completas
- **WHEN** el usuario tiene las 36 preguntas respondidas (guardadas como borrador o escritas en el
  momento)
- **THEN** el control de envío del cuestionario se habilita, permitiendo disparar el análisis descrito
  en la siguiente sección

### Requirement: Edición del cuestionario ya completado desde el perfil
El sistema SHALL permitir a un usuario que ya completó su cuestionario modificar sus 36 respuestas desde
su página de perfil, aplicando las mismas reglas de validación que el envío inicial.

#### Scenario: Edición válida de respuestas
- **WHEN** un usuario con cuestionario ya completado envía, desde su perfil, una actualización con las
  36 respuestas válidas
- **THEN** el sistema sustituye las respuestas almacenadas y marca su perfil como pendiente de
  recalcular compatibilidad (ver `candidate-matching`)

#### Scenario: Edición incompleta
- **WHEN** un usuario intenta actualizar su cuestionario con menos de 36 respuestas o con alguna
  pregunta sin identificar
- **THEN** el sistema rechaza la actualización y conserva intactas las respuestas anteriores

### Requirement: Presentación en 6 paneles agrupados por bloque de peso
El sistema SHALL presentar las 36 preguntas agrupadas en 6 paneles colapsables independientes, uno por
cada bloque de 6 preguntas usado en el cálculo ponderado (bloque 1 = preguntas 1-6, ..., bloque 6 =
preguntas 31-36), y SHALL dar a cada panel un estilo visual (gradiente de fondo) que refleje su peso
relativo en el resultado final, de forma que los bloques con más peso se distingan visualmente de los
de menos peso.

#### Scenario: Bloques de igual peso se ven igual
- **WHEN** se muestran los paneles de los bloques 1 y 2 (ambos con el mismo peso del 5%)
- **THEN** ambos paneles usan exactamente el mismo estilo de fondo, sin diferencias visuales entre
  ellos

#### Scenario: A mayor peso, estilo visualmente más intenso
- **WHEN** se comparan los paneles de los 6 bloques entre sí
- **THEN** el estilo de fondo progresa de forma perceptible desde el bloque de menor peso (5%) hasta el
  de mayor peso (30%), sin que ningún bloque de menor peso se muestre con un estilo más intenso que uno
  de mayor peso

#### Scenario: Los paneles no bloquean el envío incompleto
- **WHEN** el usuario navega libremente entre paneles sin responder todas las preguntas
- **THEN** el sistema permite abrir y cerrar los paneles en cualquier orden, pero sigue exigiendo las 36
  respuestas completas para poder enviar el cuestionario

### Requirement: Preguntas de un bloque presentadas como pestañas, no apiladas
El sistema SHALL presentar las 6 preguntas de un panel abierto como pestañas independientes (una
pregunta visible a la vez), en vez de mostrarlas apiladas verticalmente, e indicar en cada pestaña si su
pregunta ya tiene respuesta. El sistema SHALL animar el cambio de pestaña con una transición visual.

#### Scenario: Una sola pregunta visible a la vez dentro de un bloque
- **WHEN** el usuario abre un panel de bloque
- **THEN** ve 6 pestañas (una por pregunta) y el contenido de una sola pregunta a la vez, no las 6
  preguntas apiladas en la misma vista

#### Scenario: Cambio de pestaña con transición visual
- **WHEN** el usuario selecciona una pestaña distinta dentro del mismo bloque
- **THEN** el contenido de la nueva pregunta aparece con una transición visual (no un cambio
  instantáneo y brusco), salvo que el usuario tenga activada la preferencia de movimiento reducido, en
  cuyo caso el cambio de pestaña sigue funcionando sin la animación

#### Scenario: Las pestañas reflejan qué preguntas están respondidas
- **WHEN** se muestran las pestañas de un bloque
- **THEN** cada pestaña indica visualmente si su pregunta ya tiene una respuesta guardada o no

#### Scenario: El campo de respuesta tiene tamaño suficiente
- **WHEN** se muestra la pregunta activa de un bloque
- **THEN** el campo de respuesta ocupa todo el ancho disponible del panel y su altura permite ver al
  menos 4 líneas de texto sin necesidad de hacer scroll

### Requirement: Persistencia en estructura JSON prefijada
El sistema SHALL almacenar las respuestas como un array de 36 objetos con la forma
`{questionId, question, answer}`, usando la misma interfaz compartida entre backend y frontend.

#### Scenario: Estructura almacenada respeta el contrato
- **WHEN** se guarda un cuestionario completo
- **THEN** el registro persistido en base de datos contiene exactamente 36 elementos, cada uno con
  `questionId`, `question` y `answer` no vacíos
