## ADDED Requirements

### Requirement: Completar perfil tras autenticarse (paso 2 del alta)
El sistema SHALL permitir a un usuario ya autenticado (ver `authentication`) completar su perfil una
única vez, indicando nombre, alias único, una foto y exactamente 5 cualidades personales.

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

### Requirement: Sin perfil, cualquier ruta redirige a completar perfil paso 1
El sistema SHALL redirigir a la pantalla de completar perfil (paso 1) a cualquier usuario autenticado
que todavía no tenga fila de perfil (`users`), sin importar a qué ruta de la aplicación intente acceder
— no solo justo después de iniciar sesión. Esta redirección deja de aplicar en cuanto el perfil existe.

#### Scenario: Login sin perfil aterriza en completar perfil paso 1
- **WHEN** un usuario autenticado sin perfil aún inicia sesión
- **THEN** el sistema lo lleva directamente al paso 1 de completar perfil (foto, nombre, alias) — nunca
  al paso 2, al cuestionario, al dashboard, a configuración o a los chats

#### Scenario: Intentar navegar a otra ruta sin perfil redirige de vuelta
- **WHEN** un usuario autenticado sin perfil aún intenta acceder directamente (por URL o navegación) a
  cualquier otra pantalla de la aplicación
- **THEN** el sistema lo redirige a completar perfil (paso 1) en vez de mostrar la pantalla solicitada

#### Scenario: Con perfil ya completado, la redirección forzada no aplica
- **WHEN** un usuario cuyo perfil ya existe navega por la aplicación
- **THEN** el sistema no lo fuerza a completar perfil; se aplican en su lugar las reglas de
  enrutamiento normales (cuestionario o dashboard, ver `results-dashboard`)

### Requirement: Completar perfil presentado como wizard de 2 pasos
El sistema SHALL presentar la captura de nombre/foto/alias y la selección de cualidades como dos pasos
secuenciales de una misma pantalla (paso 1: foto, nombre y alias; paso 2: cualidades), en vez de un
único formulario con todos los campos a la vez, pero SHALL seguir enviando ambos pasos juntos en una
única petición al terminar el paso 2 — el paso 1 no persiste nada por sí solo.

#### Scenario: Avanzar del paso 1 al paso 2 no envía nada al backend
- **WHEN** el usuario completa foto, nombre y alias válidos en el paso 1 y pulsa "Siguiente"
- **THEN** el sistema avanza al paso 2 (cualidades) sin haber creado ni modificado ningún perfil todavía

#### Scenario: El envío real ocurre al terminar el paso 2
- **WHEN** el usuario, ya en el paso 2, selecciona exactamente 5 cualidades y confirma
- **THEN** el sistema envía en una sola petición los datos de ambos pasos y crea el perfil como describe
  el escenario de "Registro de perfil exitoso"

### Requirement: Selección de cualidades como píldoras con tope de 5 y envío bloqueado hasta exactamente 5
El sistema SHALL presentar las 15 cualidades como elementos seleccionables independientes (píldoras) que
el usuario puede desmarcar libremente en todo momento, pero SHALL impedir marcar una sexta cualidad
mientras ya haya 5 marcadas — el límite se hace cumplir en la propia interacción, no solo al enviar. El
sistema SHALL además bloquear el envío del formulario de perfil mientras el número de cualidades
seleccionadas sea distinto de 5; el resto de campos del formulario (nombre, alias, foto) permanecen
editables y no bloqueados por esta regla.

#### Scenario: Envío bloqueado con una selección incompleta
- **WHEN** el usuario tiene seleccionadas menos de 5 o más de 5 cualidades
- **THEN** el control de envío del formulario permanece deshabilitado, aunque el resto de campos
  (nombre, alias, foto) estén completos

#### Scenario: Envío habilitado con exactamente 5 seleccionadas
- **WHEN** el usuario selecciona exactamente 5 cualidades
- **THEN** el control de envío del formulario se habilita, siempre que el resto de campos obligatorios
  también sean válidos

#### Scenario: Intento de marcar una sexta cualidad
- **WHEN** el usuario ya tiene 5 cualidades marcadas e intenta marcar una adicional
- **THEN** la interfaz impide marcar una cualidad más sin antes desmarcar alguna de las 5 ya elegidas

### Requirement: Catálogo de cualidades disponible públicamente
El sistema SHALL exponer el catálogo de las 15 cualidades personales para que el formulario de perfil
pueda listarlas.

#### Scenario: Consulta del catálogo
- **WHEN** el frontend solicita el listado de cualidades
- **THEN** el sistema devuelve las 15 cualidades del catálogo con su identificador y etiqueta
