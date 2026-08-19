## MODIFIED Requirements

### Requirement: Completar perfil tras autenticarse (paso 2 del alta)
El sistema SHALL permitir a un usuario ya autenticado (ver `authentication`) completar su perfil una
única vez, indicando nombre, alias único, una foto y exactamente 5 cualidades personales. El sistema
SHALL indicar visualmente, antes de intentar enviar el formulario, cuáles de esos campos son
obligatorios.

#### Scenario: Registro de perfil exitoso
- **WHEN** un usuario autenticado sin perfil aún envía nombre, un alias no usado por nadie más, una
  foto válida (jpg/png/webp, ≤2MB) y exactamente 5 IDs de cualidades del catálogo
- **THEN** el sistema crea el perfil vinculado a su cuenta, sube la foto a almacenamiento y guarda las
  5 cualidades asociadas

#### Scenario: Alias ya utilizado
- **WHEN** un usuario intenta registrar su perfil con un alias que ya usa otra cuenta
- **THEN** el sistema rechaza la petición indicando que el alias no está disponible, sin crear el
  perfil

#### Scenario: Selección de más de 5 cualidades
- **WHEN** un usuario envía más de 5 IDs de cualidades
- **THEN** el sistema rechaza la petición con un error de validación y no crea el perfil

#### Scenario: Selección de menos de 5 cualidades
- **WHEN** un usuario envía menos de 5 IDs de cualidades
- **THEN** el sistema rechaza la petición con un error de validación y no crea el perfil

#### Scenario: Foto con formato no soportado
- **WHEN** un usuario envía un archivo de foto que no es jpg, png ni webp
- **THEN** el sistema rechaza la petición sin subir el archivo ni crear el perfil

#### Scenario: Foto que excede el tamaño máximo
- **WHEN** un usuario envía una foto de más de 2MB
- **THEN** el sistema rechaza la petición sin subir el archivo ni crear el perfil

#### Scenario: Intento de completar el perfil sin sesión autenticada
- **WHEN** se intenta enviar el formulario de perfil sin un token de sesión válido
- **THEN** el sistema rechaza la petición y no crea ningún perfil

#### Scenario: Campos obligatorios indicados visualmente antes de enviar
- **WHEN** un usuario ve el paso 1 del formulario de completar perfil
- **THEN** los campos de nombre y alias muestran un indicador visual de que son obligatorios, y esa
  misma condición es perceptible por tecnología de asistencia (atributo nativo de campo obligatorio),
  no solo por color
