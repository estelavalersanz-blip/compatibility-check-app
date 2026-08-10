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

### Requirement: Persistencia en estructura JSON prefijada
El sistema SHALL almacenar las respuestas como un array de 36 objetos con la forma
`{questionId, question, answer}`, usando la misma interfaz compartida entre backend y frontend.

#### Scenario: Estructura almacenada respeta el contrato
- **WHEN** se guarda un cuestionario completo
- **THEN** el registro persistido en base de datos contiene exactamente 36 elementos, cada uno con
  `questionId`, `question` y `answer` no vacíos
