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
solo que lo has construido. No hace falta profundizar en todos los puntos con el mismo detalle; elige
el orden y el nivel que te resulte natural.

Qué decir:
- **Stack**: NestJS + Angular (zoneless) + Supabase (Postgres/Auth/Storage), tipos compartidos entre
  frontend y backend validados con Zod -- una librería de TypeScript que define el tipo *y* lo valida
  en tiempo de ejecución a la vez, en un único sitio, en vez de un tipo que no protege nada si el
  dato real no coincide con lo esperado.
- **CI/CD**: GitHub Actions con 2 jobs en cada push/PR -- uno de lint + tests unitarios + e2e + build
  (con mocks, sin Docker), y otro de tests de integración que arranca un Supabase real en el propio
  runner, no solo contra mocks. Despliegue sin pipeline propio: cada push a `main` dispara un deploy
  nuevo en Vercel (frontend) y Render (backend) por su integración nativa con GitHub, sin Terraform.
  La rama `main` está protegida -- exige los dos jobs en verde antes de poder mergear.
- **Un reto real que tuviste que resolver**: el límite de tokens/minuto del plan gratuito de Groq
  obligó a pasar de analizar las 36 preguntas a muestrear 6 (una por bloque, no al azar puro, para no
  perder representación del bloque de más peso) — cuéntalo como el tipo de decisión de ingeniería
  real que exige un límite de producción, no solo una elección de diseño en el vacío.
- **Seguridad, en dos capas**: RLS en Postgres + un backend que es el único punto con permiso para
  leer comparaciones y mensajes de chat — ni siquiera el propio usuario puede leer su respuesta de
  texto de vuelta en el detalle de una comparación.
- **No es solo una afirmación, está demostrado con TDD**: sin la política RLS de `users`, 7 de los 10
  casos de test fallan de verdad (confirmando el hueco real); con la política aplicada, 10 de 10 en
  verde. Rojo antes de arreglar, verde después — no al revés.
- **Minimización de información**: si pides el detalle de una comparación o de un mensaje que no es
  tuyo, o que directamente no existe, el sistema responde exactamente lo mismo en los dos casos (un
  404 idéntico) — nunca revela si algo existe pero no es tuyo frente a si no existe en absoluto.
- **JWT delegado, no reinventado**: el backend nunca implementa su propia verificación de firma ni
  gestiona un secreto de JWT propio — valida cada token llamando a la propia API de Supabase Auth
  (`getUser`), la misma fuente de verdad que lo emitió.
- **Contraseñas**: nunca se guardan en texto plano — Supabase Auth (GoTrue) las hashea con bcrypt
  antes de persistirlas, este código no las ve ni las loguea en ningún punto. Además, el frontend
  exige mayúscula, minúscula y carácter especial, informado antes de fallar, no solo después.
- **Los mensajes de chat también van cifrados**: el cuerpo de cada mensaje se cifra en reposo
  (AES-256-GCM) antes de guardarse en Postgres, con una clave propia de la aplicación que solo tiene
  el backend — nunca en el repositorio. Es cifrado en reposo, no de extremo a extremo (el backend
  sigue pudiendo descifrar para poder servir los mensajes) — ver el bloque "Próximos pasos" para el
  motivo de por qué no se ha ido más allá todavía.
- **Patrones de arquitectura**: CQRS selectivo -- Commands solo donde hay un evento de dominio real
  que publicar (completar el cuestionario, no cada `PATCH` de perfil) -- y una cadena de eventos que
  desacopla módulos sin que se importen entre sí: `QuestionnaireCompletedEvent` dispara la selección
  de candidatos, que a su vez dispara `ComparisonsCreatedEvent` y desencadena el análisis por IA.
  Ninguno de los tres módulos conoce a los otros dos, solo el tipo del evento. En el frontend, dos
  patrones más: guards funcionales que devuelven un `UrlTree` en vez de una ruta a pelo, e intervalos
  de sondeo inyectables (`InjectionToken`) para poder sobreescribirlos por unos de milisegundos en
  los tests, sin `fakeAsync` -- este proyecto no carga `zone.js/testing`. Toda la reactividad de la
  app, de hecho, es zoneless -- vale la pena explicar qué gana con esto, ya que sale varias veces:
  sin `zone.js`, Angular no parchea cada API asíncrona del navegador (`setTimeout`, promesas,
  eventos del DOM...) para detectar "algo ha pasado, revisa todo el árbol de componentes por si
  cambió algo" -- la reactividad depende solo de *signals*, que saben con precisión qué valor
  cambió y qué hay que repintar. Menos JavaScript que enviar al navegador, menos comprobaciones
  innecesarias en cada evento, y es la dirección en la que el propio Angular está yendo, no una
  apuesta rara. Tiene un coste real, no es gratis: hay que ser explícito con la reactividad a mano
  -- gotcha real de este proyecto, el sondeo periódico (de mensajes, de no leídos) necesita una
  primera carga con una suscripción directa al arrancar, nunca envuelta en un `timer`, porque sin
  `zone.js` las herramientas de test no esperan solas una tarea asíncrona que nadie les avisó que
  existía.
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

## 11. Escalabilidad: cómo migraría esto a producción

Ya está documentado en `docs/plan.md` ("Propuesta de migración a producción") como prueba de que la
arquitectura se pensó con visión de escalar, no solo para pasar el TFM — no es una idea suelta que se
te ocurre en el vídeo, tiene detrás una tabla completa con pasos y beneficios concretos.

Qué decir:
- **La pieza que lo hace posible sin reescribir nada**: `ai-provider.interface.ts` aísla al
  orquestador del proveedor de IA concreto — cambiar de proveedor, o añadir uno nuevo, es una
  clase nueva implementando la misma interfaz, cero cambios en el resto del sistema.
- **LLM, de free tier a producción real**, en pasos incrementales: (1) la misma cuenta de Groq a su
  plan de pago, sube los límites de tasa sin tocar código; (2) añadir Claude como proveedor
  alternativo para mejor calidad de razonamiento psicológico y salida estructurada nativa; (3) con un
  modelo de mayor ventana de contexto, menos llamadas por comparación; (4) la Batch API del
  proveedor para los análisis, con descuentos habituales de ~50% frente a llamadas síncronas —
  encaja de forma natural porque el análisis ya es asíncrono en el diseño actual (pantalla de
  "procesando" + sondeo).
- **Selección de candidatos: más criterios, y revisar el tope de 3**: hoy la preselección usa un
  único criterio -- cualidades coincidentes -- y `users` ni siquiera guarda edad, sexo o
  intencionalidad (qué tipo de conexión busca cada persona). Añadir esos filtros *antes* de contar
  cualidades acotaría el pool a candidatos relevantes por esos ejes, en vez de dejar que las
  cualidades sean el único criterio. Y el tope de 3 tampoco es un número de producto cerrado: se
  eligió también por el límite real de llamadas a la IA de esta fase -- el mismo límite que motivó
  muestrear 6 preguntas en vez de 36 -- así que subir los límites de tasa o pasar a la Batch API
  (los mismos pasos de arriba) es lo que haría viable subir también este número, no solo una promesa
  suelta.
- **Despliegue, de plan gratuito a infraestructura real**: backend a un plan con autoscaling (Render
  de pago, Fly.io, contenedores en la nube); frontend a un plan Pro o un CDN dedicado; base de datos
  a Supabase Pro (backups automáticos, point-in-time recovery) o una alternativa gestionada; fotos de
  usuario a almacenamiento de objetos dedicado (Cloudflare R2, S3) en vez de un bucket incluido en el
  plan de base de datos.
- **Si se planteara comercializar** (mención breve, no hace falta profundizar): cumplimiento RGPD
  real —las fotos y las respuestas del cuestionario son datos personales sensibles—, observabilidad
  dedicada más allá de logs (monitorización de errores, coste de IA por análisis), login
  social/OAuth, verificación de email obligatoria, y una pasarela de pago si hubiera un modelo de
  negocio detrás.

Qué mostrar: opcional, puedes quedarte en el dashboard o mostrar brevemente
`apps/backend/src/ai/ai-provider.interface.ts` si quieres señalar la pieza concreta que hace posible
todo lo anterior sin reescribir el sistema.

## 12. Cierre

Qué decir:
- Un resumen de una frase de lo que has construido y qué te ha aportado el proyecto.
- Menciona que el repositorio, el despliegue y las slides están enlazados en la documentación.

Qué mostrar: puedes volver a la landing o dejar el dashboard en pantalla.
