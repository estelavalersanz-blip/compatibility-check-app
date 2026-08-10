## ADDED Requirements

### Requirement: Acceso a configuración desde la cabecera
El sistema SHALL mostrar, en la esquina superior derecha de toda pantalla autenticada, un botón de
configuración (además del botón de cerrar sesión) que abre la pantalla de edición del perfil.

#### Scenario: Apertura de configuración
- **WHEN** un usuario autenticado pulsa el botón de configuración
- **THEN** el sistema muestra un formulario prerellenado con su nombre, alias, foto, cualidades y
  respuestas del cuestionario actuales

### Requirement: Edición de nombre, alias, foto y cualidades
El sistema SHALL permitir modificar el nombre, el alias, la foto y la selección de cualidades de un
perfil ya existente, aplicando las mismas reglas de validación que en el registro (alias único en todo
el sistema salvo el propio usuario, exactamente 5 cualidades, foto en formato y tamaño válidos).

#### Scenario: Guardado exitoso de cambios
- **WHEN** un usuario envía cambios válidos de nombre, alias, foto y/o cualidades
- **THEN** el sistema actualiza el perfil y refleja los nuevos datos en el resto de la interfaz (por
  ejemplo, la cabecera y futuras tarjetas de resultado)

#### Scenario: Alias ya usado por otro usuario
- **WHEN** un usuario intenta cambiar su alias a uno ya usado por otra cuenta
- **THEN** el sistema rechaza el cambio manteniendo el alias anterior

#### Scenario: Selección de cualidades distinta de 5
- **WHEN** un usuario intenta guardar cambios con un número de cualidades distinto de 5
- **THEN** el sistema rechaza el guardado de esa sección y mantiene la selección anterior hasta que se
  corrija a exactamente 5

#### Scenario: Cambiar la selección de cualidades marca el perfil como pendiente de recalcular
- **WHEN** un usuario guarda una selección de cualidades distinta de la que tenía antes
- **THEN** el sistema marca su perfil como pendiente de recalcular compatibilidad (ver
  `candidate-matching`), habilitando el botón de recálculo en el dashboard

### Requirement: Edición de las respuestas del cuestionario desde el perfil
El sistema SHALL permitir, desde la misma pantalla de configuración, editar las 36 respuestas del
cuestionario de un perfil que ya lo tenga completado (ver `personal-questionnaire`).

#### Scenario: Edición de respuestas desde configuración marca el perfil como pendiente de recalcular
- **WHEN** un usuario guarda cambios válidos en sus 36 respuestas desde la pantalla de configuración
- **THEN** el sistema sustituye las respuestas almacenadas y marca su perfil como pendiente de
  recalcular compatibilidad, habilitando el botón de recálculo en el dashboard

### Requirement: Cambio de contraseña con reautenticación
El sistema SHALL exigir la contraseña actual, además de la nueva, para poder cambiar la contraseña desde
la pantalla de configuración.

#### Scenario: Cambio de contraseña exitoso
- **WHEN** un usuario introduce correctamente su contraseña actual y una nueva contraseña válida
- **THEN** el sistema actualiza la contraseña de la cuenta

#### Scenario: Contraseña actual incorrecta
- **WHEN** un usuario introduce una contraseña actual incorrecta al intentar cambiarla
- **THEN** el sistema rechaza el cambio sin modificar la contraseña existente
