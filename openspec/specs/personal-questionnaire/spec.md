# Personal Questionnaire

## Purpose

Recoge las respuestas de un usuario al cuestionario de 36 preguntas de compatibilidad, presentado como
un wizard de 6 bloques de peso incremental con una pregunta a pantalla completa, con guardado de
borrador persistente en base de datos (no en `localStorage`), envío final que dispara el análisis de
compatibilidad, y edición posterior desde el perfil.

## Requirements

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
- **THEN** el sistema le muestra sus respuestas ya guardadas, prerellenadas en los bloques
  correspondientes, sin que tenga que volver a escribirlas, y posiciona el wizard en el primer bloque
  que tenga alguna pregunta sin responder (o en el bloque 6 si las 36 ya están respondidas)

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

### Requirement: Presentación como wizard de 6 pasos agrupados por bloque de peso
El sistema SHALL presentar las 36 preguntas agrupadas en 6 bloques de 6 preguntas cada uno (bloque 1 =
preguntas 1-6, ..., bloque 6 = preguntas 31-36), mostrando **un único bloque a la vez** (nunca los 6
simultáneamente en la misma pantalla) como pasos de un wizard, y SHALL dar al bloque activo un estilo
visual (gradiente de fondo) que refleje su peso relativo en el resultado final, de forma que los bloques
con más peso se distingan visualmente de los de menos peso. Los controles para avanzar o retroceder de
bloque SHALL ser distintos, en posición y en función, del control de envío final del cuestionario — no
SHALL compartir el mismo control ni cambiar su función según el bloque en el que se esté.

#### Scenario: Bloques de igual peso se ven igual
- **WHEN** se muestra el bloque 1 y, en otro momento, el bloque 2 (ambos con el mismo peso del 5%)
- **THEN** ambos usan exactamente el mismo estilo de fondo, sin diferencias visuales entre ellos

#### Scenario: A mayor peso, estilo visualmente más intenso
- **WHEN** se comparan los 6 bloques entre sí a lo largo del wizard
- **THEN** el estilo de fondo progresa de forma perceptible desde el bloque de menor peso (5%) hasta el
  de mayor peso (30%), sin que ningún bloque de menor peso se muestre con un estilo más intenso que uno
  de mayor peso

#### Scenario: Nunca se muestra más de un bloque a la vez
- **WHEN** el usuario está viendo cualquier bloque del cuestionario
- **THEN** el sistema no monta ni muestra el contenido de los otros 5 bloques en la misma pantalla

#### Scenario: Avanzar de bloque no exige haberlo completado
- **WHEN** el usuario avanza al siguiente bloque sin haber respondido todas las preguntas del bloque
  actual
- **THEN** el sistema permite el avance, pero sigue exigiendo las 36 respuestas completas para poder
  enviar el cuestionario

#### Scenario: Volver a revisar y editar un bloque anterior
- **WHEN** el usuario, estando en un bloque posterior, navega hacia atrás (paso a paso o saltando
  directamente) hasta un bloque ya visitado anteriormente
- **THEN** el sistema muestra ese bloque con sus respuestas ya guardadas, permite editarlas, y ofrece una
  forma de volver directamente al bloque más avanzado que el usuario había alcanzado

#### Scenario: No se puede saltar a un bloque aún no alcanzado
- **WHEN** el usuario intenta navegar directamente a un bloque posterior al más avanzado que ha
  alcanzado (por ejemplo, saltar del bloque 2 al bloque 5 sin haber pasado por el 3 y el 4)
- **THEN** el sistema no permite ese salto; solo se puede avanzar bloque a bloque

#### Scenario: El control de envío final solo aparece en el último bloque
- **WHEN** el usuario está en cualquier bloque anterior al último
- **THEN** el control de envío/guardado final del cuestionario no se muestra; solo están disponibles los
  controles de avanzar/retroceder de bloque

#### Scenario: Navegación de bloque visualmente distinguible de la navegación de preguntas
- **WHEN** el usuario ve los controles de navegación del bloque activo
- **THEN** los controles de avanzar/retroceder de bloque son visualmente distintos de los de
  avanzar/retroceder entre las preguntas del propio bloque, aunque compartan la misma zona de la
  pantalla

### Requirement: Una pregunta a pantalla completa, con navegación por puntos
El sistema SHALL presentar las 6 preguntas del bloque activo de una en una, ocupando toda la pantalla
(no apiladas ni como pestañas), con una fila de 6 puntos y flechas de avance/retroceso que indican, para
cada pregunta, si ya tiene respuesta. El sistema SHALL permitir saltar directamente a cualquier pregunta
ya visitada haciendo clic en su punto, y SHALL animar el cambio de pregunta con una transición visual.

#### Scenario: Una sola pregunta visible a la vez dentro de un bloque
- **WHEN** el usuario está en un bloque del cuestionario
- **THEN** ve el contenido de una sola pregunta a pantalla completa, con una fila de 6 puntos y flechas
  debajo, no las 6 preguntas apiladas ni como pestañas en la misma vista

#### Scenario: Cambio de pregunta con transición visual
- **WHEN** el usuario avanza, retrocede o hace clic en un punto para cambiar de pregunta dentro del
  mismo bloque
- **THEN** el contenido de la nueva pregunta aparece con una transición visual (no un cambio
  instantáneo y brusco), salvo que el usuario tenga activada la preferencia de movimiento reducido, en
  cuyo caso el cambio de pregunta sigue funcionando sin la animación

#### Scenario: Los puntos reflejan qué preguntas están respondidas
- **WHEN** se muestra la fila de puntos de un bloque
- **THEN** cada punto indica visualmente si su pregunta ya tiene una respuesta guardada o no

#### Scenario: Salto directo a una pregunta ya visitada
- **WHEN** el usuario hace clic en el punto de una pregunta del bloque activo que ya visitó antes
- **THEN** el sistema muestra directamente esa pregunta, sin tener que pasar pregunta a pregunta con las
  flechas

#### Scenario: No se puede saltar a una pregunta aún no alcanzada
- **WHEN** el usuario intenta hacer clic en el punto de una pregunta posterior a la más avanzada que ha
  alcanzado dentro del bloque activo
- **THEN** el sistema no permite ese salto; solo se puede avanzar pregunta a pregunta con la flecha

#### Scenario: El campo de respuesta tiene tamaño suficiente
- **WHEN** se muestra la pregunta activa de un bloque
- **THEN** el campo de respuesta ocupa todo el ancho disponible del panel y su altura permite ver al
  menos 4 líneas de texto sin necesidad de hacer scroll

### Requirement: Pantalla de bienvenida antes del wizard, solo la primera vez
El sistema SHALL mostrar, antes del bloque 1, una única pantalla de transición (título, frase invitando
a responder con calma, y un botón para empezar) la primera vez que un usuario entra al cuestionario para
completarlo, y SHALL omitir esa pantalla cuando el usuario entra a editar un cuestionario ya completado.

#### Scenario: Bienvenida al completar el cuestionario por primera vez
- **WHEN** un usuario sin cuestionario completado todavía abre el cuestionario
- **THEN** el sistema muestra la pantalla de bienvenida antes de dar acceso al bloque 1, y solo entra al
  wizard cuando el usuario pulsa el botón de esa pantalla

#### Scenario: Sin bienvenida al editar un cuestionario ya completado
- **WHEN** un usuario con cuestionario ya completado entra a editar sus respuestas desde su perfil
- **THEN** el sistema muestra directamente el wizard con sus respuestas ya prerellenadas, sin mostrar la
  pantalla de bienvenida

### Requirement: Persistencia en estructura JSON prefijada
El sistema SHALL almacenar las respuestas como un array de 36 objetos con la forma
`{questionId, question, answer}`, usando la misma interfaz compartida entre backend y frontend.

#### Scenario: Estructura almacenada respeta el contrato
- **WHEN** se guarda un cuestionario completo
- **THEN** el registro persistido en base de datos contiene exactamente 36 elementos, cada uno con
  `questionId`, `question` y `answer` no vacíos
