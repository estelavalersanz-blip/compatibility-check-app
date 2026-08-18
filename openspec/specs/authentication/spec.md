# Authentication

## Purpose

Gestiona la identidad de los usuarios delegando por completo en Supabase Auth: landing pública para
quien no tiene sesión, registro y login por email/contraseña, recuperación de contraseña, cierre de
sesión, y protección de las rutas que exigen una sesión válida — sin implementar hashing, tokens ni
envío de email a mano.

## Requirements

### Requirement: Landing pública antes de cualquier pantalla de autenticación
El sistema SHALL mostrar, a quien visita la aplicación sin una sesión activa, una pantalla pública que
explica la finalidad del producto con un único botón que navega a la pantalla de login. El sistema SHALL
omitir esa pantalla y redirigir directamente al estado autenticado correspondiente cuando quien visita
la aplicación ya tiene una sesión activa.

#### Scenario: Visita sin sesión ve la landing
- **WHEN** alguien sin sesión activa visita la ruta principal de la aplicación
- **THEN** el sistema muestra la pantalla pública explicativa, sin exigir ningún dato ni redirigir a
  login automáticamente

#### Scenario: El botón de la landing lleva a login
- **WHEN** quien visita la landing pulsa su único botón de llamada a la acción
- **THEN** el sistema navega a la pantalla de login

#### Scenario: Visita con sesión activa no ve la landing
- **WHEN** alguien con una sesión ya activa visita la ruta principal de la aplicación
- **THEN** el sistema no muestra la landing y redirige directamente al cuestionario o al dashboard,
  según corresponda (ver `results-dashboard`, "Enrutamiento de la página principal")

### Requirement: Registro con email y contraseña (paso 1)
El sistema SHALL permitir crear una cuenta con email y contraseña, verificando que el email no exista
ya previamente, antes de permitir continuar al paso 2 (completar el perfil).

#### Scenario: Registro exitoso con email nuevo
- **WHEN** un visitante envía un email no registrado previamente y una contraseña válida
- **THEN** el sistema crea la cuenta con la contraseña hasheada, abre una sesión y permite avanzar a la
  pantalla de completar perfil (nombre, alias, foto, cualidades)

#### Scenario: Intento de registro con email ya existente
- **WHEN** un visitante intenta registrarse con un email que ya tiene una cuenta creada
- **THEN** el sistema rechaza el registro e informa de que el email ya está en uso, sin crear una
  cuenta duplicada

### Requirement: Inicio de sesión con email y contraseña
El sistema SHALL permitir iniciar sesión con un email y contraseña ya registrados.

#### Scenario: Login exitoso
- **WHEN** un usuario envía un email registrado y su contraseña correcta
- **THEN** el sistema abre una sesión autenticada y redirige a su estado correspondiente (completar
  perfil si aún no lo tiene, o al dashboard/cuestionario si ya lo tiene)

#### Scenario: Login con credenciales incorrectas
- **WHEN** un usuario envía un email no registrado o una contraseña incorrecta
- **THEN** el sistema rechaza el inicio de sesión sin especificar cuál de los dos datos es incorrecto

### Requirement: Cierre de sesión
El sistema SHALL permitir cerrar la sesión activa desde un botón visible en la esquina superior derecha
de la interfaz autenticada.

#### Scenario: Logout exitoso
- **WHEN** un usuario autenticado pulsa el botón de cerrar sesión
- **THEN** el sistema invalida la sesión activa y redirige a la pantalla de autenticación

### Requirement: Recuperación de contraseña por email
El sistema SHALL permitir solicitar un email de recuperación de contraseña desde la pantalla de login, y
permitir establecer una nueva contraseña a partir del enlace recibido.

#### Scenario: Solicitud de recuperación
- **WHEN** un usuario introduce su email en la opción "¿olvidaste tu contraseña?"
- **THEN** el sistema envía un email con un enlace de recuperación si el email existe, y muestra un
  mensaje de confirmación genérico independientemente de si el email existe o no

#### Scenario: Establecimiento de nueva contraseña desde el enlace
- **WHEN** un usuario abre el enlace de recuperación recibido por email e introduce una nueva
  contraseña válida
- **THEN** el sistema actualiza la contraseña de la cuenta y permite iniciar sesión con la nueva
  contraseña

### Requirement: Rutas protegidas por sesión autenticada
El sistema SHALL exigir una sesión autenticada válida para acceder a completar/editar el perfil, el
cuestionario, el estado de comparaciones y el dashboard de resultados.

#### Scenario: Acceso sin sesión
- **WHEN** una petición a un endpoint protegido llega sin un token de sesión válido
- **THEN** el sistema rechaza la petición con un error de autenticación y no ejecuta la operación
