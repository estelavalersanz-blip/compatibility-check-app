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

Qué mostrar: la lista de conversaciones y, si hay alguna con mensajes, ábrela.

## 8. Configuración (pantalla: `/settings`)

Qué decir:
- Una única pantalla para editar perfil, cualidades, contraseña (con reautenticación) y acceso a
  editar el cuestionario — con recálculo de compatibilidad integrado al guardar.

Qué mostrar: la pantalla de Configuración, señalando brevemente cada sección.

## 9. (Opcional) Un vistazo técnico

Qué decir — elige 2 o 3 de estos si quieres darle algo de profundidad técnica al vídeo, sin
convertirlo en una revisión de código:
- Stack: NestJS + Angular (zoneless) + Supabase (Postgres/Auth/Storage), tipos compartidos con Zod
  entre frontend y backend.
- Un reto real que tuviste que resolver: el límite de tokens/minuto del plan gratuito de Groq obligó
  a pasar de analizar las 36 preguntas a muestrear 6 (una por bloque, no al azar puro, para no perder
  representación del bloque de más peso) — cuéntalo como el tipo de decisión de ingeniería real que
  exige un límite de producción, no solo una elección de diseño en el vacío.
- Seguridad: RLS en Postgres + un backend que es el único punto con permiso para leer las
  comparaciones — ni siquiera el propio usuario puede leer su respuesta de texto de vuelta.
- Metodología: desarrollo guiado por especificación (OpenSpec) en vez de solo código y memoria.

Qué mostrar: opcional, puedes quedarte en el propio dashboard o mostrar brevemente el editor de
código si prefieres señalar un fichero concreto.

## 10. Cierre

Qué decir:
- Un resumen de una frase de lo que has construido y qué te ha aportado el proyecto.
- Menciona que el repositorio, el despliegue y las slides están enlazados en la documentación.

Qué mostrar: puedes volver a la landing o dejar el dashboard en pantalla.
