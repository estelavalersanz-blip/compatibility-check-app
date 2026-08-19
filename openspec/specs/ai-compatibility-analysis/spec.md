# AI Compatibility Analysis

## Purpose

Orquesta el análisis de compatibilidad entre un usuario y cada uno de sus candidatos mediante un LLM
(Groq como proveedor principal, OpenRouter como alternativa intercambiable): agrupa las 36 preguntas
en lotes, valida la salida del modelo contra el esquema esperado con reintentos ante fallos, calcula
el resultado agregado con ponderación compuesta (bloques de preguntas anidados en pesos por
dimensión), y registra el flujo completo con logging estructurado sin exponer nunca el contenido de
las respuestas de los usuarios.

## Requirements

### Requirement: Orquestación de llamadas al LLM por lotes de preguntas
El sistema SHALL analizar las 36 preguntas de cada comparación en lotes de 6 preguntas por llamada al
proveedor de IA configurado, con un máximo de 2 lotes en curso simultáneamente por comparación.

#### Scenario: Análisis completo de una comparación
- **WHEN** una comparación en estado `pending` es procesada
- **THEN** el sistema envía las 36 preguntas agrupadas en 6 lotes al proveedor de IA, valida cada
  respuesta contra el esquema esperado, persiste los 36 resultados por pregunta y marca la comparación
  como `completed`

#### Scenario: Proveedor de IA intercambiable
- **WHEN** se configura un proveedor de IA distinto al principal (p. ej. OpenRouter en vez de Groq)
- **THEN** el orquestador realiza el análisis sin cambios en su propio código, dependiendo únicamente
  de la interfaz común de proveedor

### Requirement: Validación y reintento ante salidas inválidas del LLM
El sistema SHALL validar cada respuesta del LLM contra el esquema esperado (claves exactas, valores
numéricos entre 1.00 y 10.00 con dos decimales) y reintentar hasta 3 veces con backoff ante una
respuesta inválida antes de marcar el lote como fallido.

#### Scenario: Fallo de validación con reintento exitoso
- **WHEN** la primera respuesta de un lote no es JSON válido o le faltan claves del esquema
- **THEN** el sistema reenvía el lote con una instrucción de corrección y, si la siguiente respuesta es
  válida, continúa el análisis con normalidad

#### Scenario: Fallo persistente tras los reintentos
- **WHEN** un lote sigue siendo inválido después de 3 intentos
- **THEN** el sistema marca la comparación como `status = 'error'` sin persistir resultados parciales
  inconsistentes de ese lote

#### Scenario: Reintento manual de una comparación en error
- **WHEN** se solicita el reintento manual de una comparación en estado `error`
- **THEN** el sistema repite el análisis desde cero para esa comparación

### Requirement: Cálculo del resultado agregado con ponderación compuesta (bloques dentro de dimensiones)
El sistema SHALL calcular, para cada comparación completada, la media de cada una de las 6 dimensiones
como una media ponderada por bloques de preguntas — agrupando las 36 preguntas en 6 bloques de 6 en el
mismo orden usado para los lotes de IA (bloque 1 = preguntas 1–6, ..., bloque 6 = preguntas 31–36) —
con pesos incrementales por bloque: 5%, 5%, 15%, 20%, 25%, 30%. El sistema SHALL calcular
`compatibilidad_final` como suma ponderada de esas 6 medias de dimensión (ya ponderadas por bloque)
usando los pesos por dimensión: emocional 20%, valores 25%, estilo comunicativo 10%, intereses 25%,
madurez 10%, apertura 10%. El campo `compatibilidad` por pregunta no participa en este cálculo; se
conserva solo como dato informativo del detalle por pregunta.

#### Scenario: Cálculo del score final con ponderación por bloques y dimensión
- **WHEN** las 36 respuestas de una comparación han sido puntuadas por el LLM
- **THEN** el sistema calcula, para cada dimensión, la media ponderada de sus 6 bloques de preguntas
  (5/5/15/20/25/30%), combina esas 6 medias de dimensión con los pesos por dimensión
  (20/25/10/25/10/10) para obtener `compatibilidad_final`, redondea ambos a dos decimales, y persiste
  el resultado junto con los dos vectores de pesos usados (por bloque y por dimensión)

#### Scenario: El orden de bloques coincide con el de los lotes de IA
- **WHEN** se determina a qué bloque pertenece una pregunta para el cálculo ponderado
- **THEN** el bloque se determina por la posición de la pregunta (1–6, 7–12, ..., 31–36), coincidiendo
  exactamente con la agrupación usada para los lotes de llamadas al LLM, sin introducir un segundo
  criterio de agrupación

### Requirement: Logging estructurado del flujo de análisis
El sistema SHALL registrar, con nivel y contexto por módulo, el envío y la recepción de cada lote, los
fallos de validación y cada reintento, propagando el identificador de la comparación en todos los
mensajes de una misma operación, sin registrar nunca el contenido íntegro de las respuestas de los
usuarios.

#### Scenario: Trazabilidad de una operación de análisis
- **WHEN** se procesa un lote de una comparación
- **THEN** los logs de envío, recepción y, en su caso, fallo de ese lote incluyen el mismo identificador
  de comparación, permitiendo reconstruir la operación completa sin cruzar registros de otros módulos

#### Scenario: No se exponen respuestas de usuario en los logs
- **WHEN** se registra cualquier evento del flujo de análisis
- **THEN** el mensaje de log no contiene el texto íntegro de las respuestas de los usuarios, solo
  identificadores, longitudes y metadatos

### Requirement: Uso eficiente de tokens y resiliencia ante límites de tasa del proveedor
El sistema SHALL configurar el proveedor de IA activo para minimizar el consumo de tokens no
esenciales (p. ej. tokens de razonamiento interno del modelo, cuando el proveedor lo permita) sin
degradar de forma apreciable la calidad de las puntuaciones ni de las explicaciones devueltas, y SHALL
esperar, entre reintentos de un mismo lote, un margen de tiempo del orden de segundos —no
milisegundos— acorde al tiempo real que ese proveedor tarda en restablecer un límite de tasa, en vez
de un backoff mínimo pensado solo para no ralentizar la propia suite de tests.

#### Scenario: Configuración de bajo consumo de tokens del proveedor activo
- **WHEN** el proveedor de IA activo soporta ajustar el nivel de razonamiento interno del modelo
- **THEN** el sistema lo configura al nivel más bajo que no afecte de forma apreciable a la calidad de
  la puntuación ni de la explicación devueltas

#### Scenario: Backoff con margen real tras un lote rechazado por límite de tasa
- **WHEN** un lote falla (por ejemplo, por haberse alcanzado el límite de tasa del proveedor de IA)
- **THEN** el sistema espera, antes de reintentar, un margen de tiempo realista acorde al tiempo que
  ese proveedor tarda en restablecer su límite, no un valor de milisegundos pensado solo para tests
