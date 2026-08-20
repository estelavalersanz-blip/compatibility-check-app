# Guion del vídeo de explicación (TFM)

Escaleta para grabar el vídeo que pide la documentación del TFM: captura de pantalla obligatoria,
cámara opcional. No lleva tiempos exactos — grábalo a tu ritmo y recorta después si algún bloque se
alarga. Los bloques 1-8 son la explicación funcional/de producto; el bloque 9 es opcional (más
técnico, pensado para un máster de desarrollo con IA, pero puedes acortarlo u omitirlo si el vídeo se
te alarga demasiado).

Antes de grabar: "despierta" el backend de Render con una petición de prueba unos minutos antes (cold
start de 30-60s en el plan gratuito, ver README) para que la demo no se quede esperando en pantalla.

## 1. Apertura (pantalla: landing pública, `/`)

Qué decir:
- Tu nombre y que este es el TFM del máster.
- Una frase de qué es AfinIA: una app que mide la compatibilidad entre dos personas a partir de un
  cuestionario de 36 preguntas, analizado por IA, no solo por coincidencia de gustos.
- Por qué este proyecto (motivación personal/profesional — la parte libre, la que solo tú puedes
  contar).

Qué mostrar: la landing pública con el degradado de marca y el botón de acceso.

## 2. Registro y login (pantalla: `/auth/register` o `/auth/login`)

Qué decir:
- Autenticación real con Supabase Auth (email/contraseña), con recuperación de contraseña.
- Menciona brevemente que vas a usar una cuenta de prueba ya preparada con resultados calculados
  para no tener que esperar al análisis de IA en directo (rellenar 36 preguntas + esperar a la IA
  alargaría mucho el vídeo).

Qué mostrar: la pantalla de login, iniciar sesión con `elena.luna@seed.compatibility-check.local`
(la cuenta con resultados ya calculados — ver README).

## 3. Completar perfil (pantalla: `/complete-profile`, aunque sea solo de paso)

Qué decir:
- Al registrarse, cada usuario elige nombre, alias único, sube una foto y selecciona exactamente 5
  cualidades personales de un catálogo — son esas cualidades las que luego deciden con quién te
  compara la app, antes incluso de saber el resultado.

Qué mostrar: si ya tienes sesión con una cuenta completa, puedes explicarlo señalando la pantalla de
Configuración (sección "Tu perfil") en vez de repetir el alta completa aquí.

## 4. Cuestionario de compatibilidad (pantalla: `/questionnaire` o su resumen en Configuración)

Qué decir:
- 36 preguntas agrupadas en 6 bloques temáticos, con pesos distintos (del 5% al 30%) — no todas las
  preguntas cuentan igual en el resultado final.
- Wizard de un bloque por pantalla, con barra de progreso ponderada por el peso de cada bloque.
- Se puede editar más adelante desde Configuración, y editarlo recalcula la compatibilidad.

Qué mostrar: navega un par de bloques del wizard (no hace falta completarlo entero en el vídeo si ya
tienes una cuenta con el cuestionario hecho — puedes mostrar el modo edición).

## 5. Selección de candidatos y análisis por IA (explicación, sin pantalla propia)

Qué decir — esta es la parte más "IA" del proyecto, dale peso:
- Al completar el cuestionario, el sistema selecciona automáticamente hasta 3 candidatos de un pool,
  por número de cualidades compartidas.
- Cada comparación se analiza con un LLM (Groq, con OpenRouter como alternativa intercambiable): la
  IA puntúa la compatibilidad en 6 dimensiones (emocional, valores, estilo comunicativo, intereses,
  madurez, apertura) y explica su puntuación por pregunta.
- El resultado final es una media ponderada por bloques y por dimensión, no una media simple.
- Las respuestas de texto de los usuarios nunca se muestran a nadie, ni siquiera al propio usuario en
  el detalle — solo puntuaciones y la explicación de la IA.

Qué mostrar: puedes quedarte en la pantalla de "procesando" un momento o pasar directo al dashboard.

## 6. Dashboard de resultados (pantalla: `/` tras completar el cuestionario)

Qué decir:
- Una tarjeta por candidato con su foto, alias, score final y un gráfico radar con el desglose por
  dimensión.
- Se puede expandir cada tarjeta para ver el detalle por pregunta (siempre sin exponer respuestas).
- La pantalla se actualiza sola mientras algún análisis sigue en curso, sin recargar.

Qué mostrar: abre el dashboard con la cuenta de resultados ya calculados, expande al menos una
tarjeta para mostrar el radar y el detalle por pregunta.

## 7. Chat interno (pantalla: `/chats`)

Qué decir:
- Desde una comparación ya calculada se puede abrir un chat con ese candidato — el punto de entrada
  natural una vez sabes que hay compatibilidad.
- Si quieres, un apunte técnico rápido aquí mismo (o lo dejas para el bloque 9): no hay WebSockets —
  con la conversación abierta, el frontend sondea cada 4 segundos pidiendo solo los mensajes
  posteriores al último que ya tiene, así que nunca vuelve a descargar la conversación entera.

Qué mostrar: la lista de conversaciones y, si hay alguna con mensajes, ábrela.

## 8. Configuración (pantalla: `/settings`)

Qué decir:
- Una única pantalla para editar perfil, cualidades, contraseña (con reautenticación) y acceso a
  editar el cuestionario — con recálculo de compatibilidad integrado al guardar.

Qué mostrar: la pantalla de Configuración, señalando brevemente cada sección.

## 9. Un vistazo técnico

A diferencia del resto de bloques, este SÍ conviene no saltárselo entero -- seguridad, arquitectura y
el mecanismo del chat son justo lo que un máster de desarrollo con IA quiere ver que entiendes, no
solo que lo has construido. No hace falta profundizar en los seis puntos con el mismo detalle; elige
el orden y el nivel que te resulte natural.

Qué decir:
- **Stack**: NestJS + Angular (zoneless) + Supabase (Postgres/Auth/Storage), tipos compartidos con
  Zod entre frontend y backend.
- **Un reto real que tuviste que resolver**: el límite de tokens/minuto del plan gratuito de Groq
  obligó a pasar de analizar las 36 preguntas a muestrear 6 (una por bloque, no al azar puro, para no
  perder representación del bloque de más peso) — cuéntalo como el tipo de decisión de ingeniería
  real que exige un límite de producción, no solo una elección de diseño en el vacío.
- **Seguridad, en dos capas**: RLS en Postgres + un backend que es el único punto con permiso para
  leer las comparaciones — ni siquiera el propio usuario puede leer su respuesta de texto de vuelta.
- **Contraseñas**: nunca se guardan en texto plano — Supabase Auth (GoTrue) las hashea con bcrypt
  antes de persistirlas, este código no las ve ni las loguea en ningún punto. Además, el frontend
  exige mayúscula, minúscula y carácter especial, informado antes de fallar, no solo después.
- **Los mensajes de chat también van cifrados**: el cuerpo de cada mensaje se cifra en reposo
  (AES-256-GCM) antes de guardarse en Postgres, con una clave propia de la aplicación que solo tiene
  el backend — nunca en el repositorio. Es cifrado en reposo, no de extremo a extremo (el backend
  sigue pudiendo descifrar para poder servir los mensajes) — ver el bloque "Próximos pasos" para el
  motivo de por qué no se ha ido más allá todavía.
- **Patrones de arquitectura**: CQRS selectivo (Commands solo donde hay un evento de dominio real) y
  una cadena de eventos que desacopla módulos sin que se importen entre sí --
  `QuestionnaireCompletedEvent` dispara la selección de candidatos, que a su vez dispara
  `ComparisonsCreatedEvent` y desencadena el análisis por IA.
- **Cómo se resolvió el chat sin WebSockets**: sondeo con cursor (pide solo los mensajes posteriores
  al último ya recibido, `?after=<fecha>`) a un ritmo distinto según la urgencia de cada pantalla --
  4s con la conversación abierta, 20-30s para el contador de no leídos en segundo plano, 3s mientras
  un análisis está en curso. Sin infraestructura de WebSockets que mantener en un plan gratuito.
- **Metodología**: desarrollo guiado por especificación (OpenSpec) en vez de solo código y memoria.

Qué mostrar: opcional, puedes quedarte en el propio dashboard o mostrar brevemente el editor de
código si prefieres señalar un fichero concreto (p. ej. la cadena de eventos o el guard de rutas).

## 10. Próximos pasos

Qué decir:
- El cifrado del chat es en reposo, no de extremo a extremo (E2EE) — ni siquiera hace falta que lo
  saques si ya lo mencionaste en el bloque 9, pero si quieres cerrar la parte técnica con un "hacia
  dónde iría esto después", este es el sitio.
- Por qué no E2EE todavía, en tres motivos concretos (no es que no se haya pensado):
  1. Gestión de claves multidispositivo: si la clave vive solo en el navegador, cambiar de
     dispositivo o borrar datos locales deja sin acceso al historial, salvo un sistema de backup de
     claves — nada trivial, y con sus propios riesgos si se hace mal.
  2. Verificación de identidad: cifrar sin comprobar que la clave pública recibida es de verdad la
     del interlocutor da una falsa sensación de seguridad — hacerlo bien exige una UX de
     verificación (los "números de seguridad" de Signal) que no es trivial en el alcance de un TFM.
  3. Coste/beneficio de esta fase: el cifrado en reposo ya sube el nivel de protección real (fuga de
     BD, clave de servicio filtrada, alguien mirando el dashboard de Supabase) con una fracción de
     la complejidad operativa de E2EE de verdad.

Qué mostrar: opcional, la propia diapositiva "Próximos pasos" si estás siguiendo las slides en
paralelo, o quedarte en el dashboard.

## 11. Cierre

Qué decir:
- Un resumen de una frase de lo que has construido y qué te ha aportado el proyecto.
- Menciona que el repositorio, el despliegue y las slides están enlazados en la documentación.

Qué mostrar: puedes volver a la landing o dejar el dashboard en pantalla.
