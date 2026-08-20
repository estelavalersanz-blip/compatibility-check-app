# Internal Chat

## Purpose

Permite a un usuario iniciar y mantener conversaciones de texto simple con los candidatos con los que
tiene compatibilidad calculada, con elegibilidad asimétrica para iniciar un chat, acceso a todas las
conversaciones propias (iniciadas por uno mismo o por otros) desde un icono del menú, indicador de no
leídos, y persistencia independiente del estado actual de las comparaciones — sin WebSockets, por
sondeo. El texto de cada mensaje se cifra en reposo antes de guardarse.

## Requirements

### Requirement: Inicio de un chat desde una tarjeta de compatibilidad
El sistema SHALL permitir a un usuario iniciar una conversación con cualquiera de los candidatos que
aparecen en su propio dashboard de resultados, disparando la acción desde la tarjeta de ese candidato.

#### Scenario: Inicio de conversación con un candidato propio
- **WHEN** un usuario, desde la tarjeta de uno de sus candidatos en el dashboard, inicia un chat
- **THEN** el sistema crea una conversación entre ambos usuarios (si no existía ya) y navega a ella

#### Scenario: Reutilización de una conversación ya existente
- **WHEN** un usuario inicia un chat con un candidato con el que ya tenía una conversación abierta
- **THEN** el sistema no crea una segunda conversación duplicada; navega a la conversación existente con
  su historial de mensajes

#### Scenario: No se puede iniciar un chat con alguien que no es candidato propio
- **WHEN** se solicita iniciar una conversación con un usuario que no aparece entre los candidatos del
  usuario que la solicita
- **THEN** el sistema rechaza la petición y no crea ninguna conversación

### Requirement: Acceso a todas las conversaciones propias desde el menú
El sistema SHALL exponer, desde un icono en el menú de la interfaz autenticada, el listado completo de
conversaciones de un usuario — tanto las que él inició como las que otro usuario le inició a él —
independientemente de si el otro participante aparece o no entre sus propios candidatos.

#### Scenario: Listado incluye conversaciones iniciadas por otros
- **WHEN** otro usuario ha iniciado una conversación con el usuario actual, aunque este último no tenga
  a ese otro usuario entre sus propios candidatos
- **THEN** esa conversación aparece en el listado de conversaciones accesible desde el menú

#### Scenario: Listado ordenado por actividad reciente
- **WHEN** el usuario abre el listado de conversaciones
- **THEN** el sistema las ordena por la fecha del mensaje más reciente de cada una, de más a menos
  reciente

#### Scenario: El icono de acceso se sitúa a la izquierda del botón de configuración
- **WHEN** se muestra la cabecera de cualquier pantalla autenticada que incluya el botón de
  Configuración
- **THEN** el icono de acceso a conversaciones aparece inmediatamente a su izquierda, en ese orden fijo

### Requirement: Envío y recepción de mensajes dentro de una conversación
El sistema SHALL permitir a los dos participantes de una conversación enviarse mensajes de texto y
SHALL mostrarlos en orden cronológico junto con quién los envió.

#### Scenario: Envío de un mensaje válido
- **WHEN** un participante de una conversación envía un mensaje con texto no vacío
- **THEN** el sistema lo persiste asociado a esa conversación y a su autor, y queda visible para ambos
  participantes

#### Scenario: Rechazo de un mensaje vacío
- **WHEN** un participante intenta enviar un mensaje sin contenido
- **THEN** el sistema rechaza el envío sin persistir nada

#### Scenario: Solo los participantes pueden leer o escribir en una conversación
- **WHEN** un usuario que no es participante de una conversación intenta leer sus mensajes o escribir en
  ella
- **THEN** el sistema rechaza la petición

### Requirement: Indicador de mensajes no leídos
El sistema SHALL indicar, en el icono de acceso a conversaciones del menú, si el usuario tiene mensajes
sin leer, y SHALL marcar los mensajes de una conversación como leídos cuando el usuario la abre.

#### Scenario: Indicador visible con mensajes pendientes
- **WHEN** el usuario tiene al menos un mensaje sin leer en cualquiera de sus conversaciones
- **THEN** el icono de acceso a conversaciones del menú muestra un indicador de no leídos

#### Scenario: El indicador desaparece al leer
- **WHEN** el usuario abre una conversación con mensajes sin leer
- **THEN** esos mensajes quedan marcados como leídos, y el indicador del menú se actualiza para reflejar
  si quedan o no otros mensajes sin leer en el resto de conversaciones

### Requirement: Cifrado en reposo del cuerpo de los mensajes
El sistema SHALL cifrar el cuerpo de cada mensaje antes de persistirlo (AES-256-GCM, clave propia
de la aplicación en `CHAT_ENCRYPTION_KEY`, nunca en el repositorio) y SHALL descifrarlo únicamente en
el momento de devolverlo a un participante autorizado de esa conversación. El acceso directo a
`conversations`/`messages` por fuera del backend (p. ej. PostgREST con el JWT del propio usuario)
SHALL estar deshabilitado, para que la garantía de cifrado no se pueda eludir insertando en texto
plano por otra vía.

#### Scenario: El mensaje se guarda cifrado, no en texto plano
- **WHEN** un participante envía un mensaje con texto válido
- **THEN** la fila persistida en `messages` no contiene el texto en claro en ninguna de sus columnas

#### Scenario: El mensaje se devuelve descifrado a los participantes
- **WHEN** un participante de la conversación consulta sus mensajes
- **THEN** el sistema le devuelve el texto original de cada mensaje, no el cifrado

#### Scenario: Mensajes anteriores a este cambio siguen siendo legibles
- **WHEN** existe un mensaje persistido antes de que este cifrado se activara (sin material de
  cifrado asociado)
- **THEN** el sistema lo sigue devolviendo tal cual, sin intentar descifrarlo ni fallar por ello

### Requirement: Las conversaciones no dependen del estado actual de las comparaciones
El sistema SHALL conservar una conversación y su historial de mensajes independientemente de que,
posteriormente, el candidato con el que se conversa deje de aparecer entre los candidatos actuales de
cualquiera de los dos participantes (por ejemplo, tras un recálculo de compatibilidad).

#### Scenario: Recalcular compatibilidad no borra conversaciones existentes
- **WHEN** un usuario recalcula su compatibilidad y sus candidatos cambian, dejando de incluir a alguien
  con quien ya tenía una conversación
- **THEN** esa conversación y sus mensajes siguen existiendo y accesibles desde el menú, sin verse
  afectados por el recálculo
