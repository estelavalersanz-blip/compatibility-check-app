# Design: Muestreo de 6 preguntas (1 por bloque) en vez de las 36 completas

## Decisión 1: Muestreo estratificado por bloque (1 de cada 6), no aleatorio puro sobre las 36

`selectSampledQuestionIds()` elige 1 pregunta al azar **de cada uno** de los 6 bloques, nunca una
selección uniforme sobre las 36 preguntas sueltas.

**Alternativa considerada y rechazada — aleatorio puro sobre las 36**: es literalmente lo que se
planteó primero en la conversación con la usuaria ("selección aleatoria de preguntas"), pero con 6
preguntas elegidas uniformemente de un total de 36, existe una probabilidad real y no despreciable
de que el bloque de mayor peso (bloque 6, 30%) quede sin ninguna pregunta representada, mientras el
de menor peso (bloques 1/2, 5% cada uno) aporte 2 o más — sesgando el resultado final hacia
dimensiones que el propio diseño del cuestionario (`BLOCK_WEIGHTS`) considera menos determinantes.
Para un TFM, ese sesgo metodológico no compensa el ahorro de tokens frente a estratificar (que cuesta
lo mismo: siguen siendo 6 preguntas, 1 por bloque, no más lotes ni más tokens).

## Decisión 2: 6 preguntas (1 por bloque), no 12 ni 18

Medido contra la API real de Groq (`reasoning_effort: 'low'`): `tokens ≈ 600 + 292 × N`. El objetivo
es que **las 3 comparaciones de una tacada** (creadas de golpe al completar el cuestionario) quepan
juntas dentro del límite de 8.000 tokens/minuto, no solo la primera:

| N por comparación | tokens por comparación | × 3 comparaciones |
|---|---|---|
| 6 (elegido) | ~2.371 (medido) | ~7.113 — cabe con margen |
| 12 | ~4.108 (medido) | ~12.324 — no cabe |
| 18 | *(no llegó a medirse: ya se había agotado el presupuesto de la propia medición)* | claramente no cabe |

N=6 es, además, exactamente 1 bloque completo de tamaño — alinea con `QUESTIONS_PER_BLOCK` sin
necesidad de ningún redondeo ni resto.

**Alternativa considerada y rechazada — priorizar que la 1ª comparación sola quepa con más margen
(N mayor, p. ej. 18-24)**: mejoraría la fidelidad de la 1ª comparación, pero no soluciona el problema
real reportado (2 de 3 comparaciones en `error`) — la 2ª y 3ª seguirían chocando contra el mismo
límite. El objetivo explícito de este change es que las 3 quepan, no solo la primera.

## Decisión 3: Nuevo muestreo aleatorio en cada análisis, no uno fijo compartido entre las 3 comparaciones de una misma ronda

Cada llamada a `analyzeComparison(comparisonId)` (una por comparación/candidato) llama a
`selectSampledQuestionIds()` de forma independiente — las 3 comparaciones de un mismo usuario
pueden, y probablemente lo hagan, evaluarse sobre 6 preguntas *distintas* cada una.

**Alternativa considerada — mismas 6 preguntas para las 3 comparaciones de una misma ronda** (fijar
el muestreo una vez por usuario/ronda, reutilizarlo en las 3 llamadas a `analyzeComparison`): haría
las 3 puntuaciones de un usuario estrictamente comparables entre sí (mismo criterio para los 3
candidatos), lo cual es deseable dado que el dashboard las ordena de mayor a menor. Se descarta por
ahora, no se rechaza en firme: exigiría pasar el conjunto de ids muestreados desde
`candidate-selector.service.ts`/el handler que crea las 3 comparaciones hasta `analyzeComparison`
(nueva columna o parámetro, cambio de esquema), mientras que la muestra ya reduce el sesgo por bloque
(decisión 1) independientemente de si es la misma para las 3 o no. Si en el futuro se observa que las
3 puntuaciones de una ronda son difíciles de comparar entre sí por este motivo, revisar esta decisión
primero.

## Decisión 4: Sin cambios en `weighting.util.ts`

`computeAggregatedResult`/`weightedDimensionMean` ya promedian sobre **lo que haya** en cada bloque
(`average(inBlock.map(...))`) — nunca asumieron un número fijo de resultados por bloque, solo que
cada resultado ya sabe a qué bloque pertenece (`blockIndexOf(questionId)`). Con 1 resultado por
bloque, la media de "1 elemento" es ese mismo valor: la ponderación por bloque (5/5/15/20/25/30%) se
aplica exactamente igual que con 6. Verificado con un test nuevo (`weighting.util.spec.ts`), no solo
por lectura del código — ver `tasks.md`.
