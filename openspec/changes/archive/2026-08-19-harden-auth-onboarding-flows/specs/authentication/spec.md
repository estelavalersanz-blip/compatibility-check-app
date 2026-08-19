## MODIFIED Requirements

### Requirement: Registro con email y contraseña (paso 1)
El sistema SHALL permitir crear una cuenta con email y contraseña, verificando que el email no exista
ya previamente, antes de permitir continuar al paso 2 (completar el perfil). El sistema SHALL informar
de forma específica cuando el registro falla por un límite de peticiones del proveedor de email, en vez
de mostrar el mismo mensaje genérico que cualquier otro fallo no reconocido.

#### Scenario: Registro exitoso con email nuevo
- **WHEN** un visitante envía un email no registrado previamente y una contraseña válida
- **THEN** el sistema crea la cuenta con la contraseña hasheada, abre una sesión y permite avanzar a la
  pantalla de completar perfil (nombre, alias, foto, cualidades)

#### Scenario: Intento de registro con email ya existente
- **WHEN** un visitante intenta registrarse con un email que ya tiene una cuenta creada
- **THEN** el sistema rechaza el registro e informa de que el email ya está en uso, sin crear una
  cuenta duplicada

#### Scenario: Límite de peticiones alcanzado al intentar registrarse
- **WHEN** el proveedor de email rechaza el envío de la confirmación de registro por haberse superado su
  límite de peticiones
- **THEN** el sistema informa de que se han hecho demasiados intentos seguidos y sugiere esperar unos
  minutos, en vez de mostrar el mensaje genérico de "no se pudo crear la cuenta"

### Requirement: Recuperación de contraseña por email
El sistema SHALL permitir solicitar un email de recuperación de contraseña desde la pantalla de login, y
permitir establecer una nueva contraseña a partir del enlace recibido. El enlace recibido SHALL dirigir
al usuario al origen real desde el que corre la aplicación (no a un valor fijo independiente del entorno
en el que se solicitó la recuperación). El sistema SHALL informar de forma específica cuando la nueva
contraseña enviada es idéntica a la actual, en vez de mostrar el mismo mensaje genérico que cualquier
otro fallo no reconocido.

#### Scenario: Solicitud de recuperación
- **WHEN** un usuario introduce su email en la opción "¿olvidaste tu contraseña?"
- **THEN** el sistema envía un email con un enlace de recuperación si el email existe, y muestra un
  mensaje de confirmación genérico independientemente de si el email existe o no

#### Scenario: Establecimiento de nueva contraseña desde el enlace
- **WHEN** un usuario abre el enlace de recuperación recibido por email e introduce una nueva
  contraseña válida y distinta de la actual
- **THEN** el sistema actualiza la contraseña de la cuenta y permite iniciar sesión con la nueva
  contraseña

#### Scenario: El enlace de recuperación lleva al origen real de la aplicación
- **WHEN** se solicita una recuperación de contraseña desde cualquier origen en el que corra la
  aplicación (local, previsualización o producción)
- **THEN** el enlace recibido por email lleva a la pantalla de establecer nueva contraseña de ese mismo
  origen, no a un origen distinto fijo

#### Scenario: Intento de establecer la misma contraseña que la actual
- **WHEN** un usuario, desde el enlace de recuperación, envía como nueva contraseña la misma que ya
  tiene la cuenta
- **THEN** el sistema rechaza la actualización e informa de que la nueva contraseña debe ser distinta de
  la actual, sin cerrar la sesión de recuperación
