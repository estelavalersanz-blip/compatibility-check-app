## MODIFIED Requirements

### Requirement: Orquestación de llamadas al LLM por lotes de preguntas
El sistema SHALL seleccionar, para cada comparación, 6 preguntas muestreadas al azar — 1 de cada uno
de los 6 bloques del cuestionario, nunca las 36 completas — y enviarlas al proveedor de IA
configurado en una única llamada, con un máximo de 2 lotes en curso simultáneamente por comparación
(previsto para si en el futuro se muestreara más de 1 pregunta por bloque, lo que volvería a repartir
el envío en más de un lote).

#### Scenario: Análisis de una comparación con preguntas muestreadas
- **WHEN** una comparación en estado `pending` es procesada
- **THEN** el sistema selecciona 6 preguntas (1 al azar de cada uno de los 6 bloques), las envía en un
  único lote al proveedor de IA, valida la respuesta contra el esquema esperado, persiste los 6
  resultados por pregunta y marca la comparación como `completed`

#### Scenario: Muestreo estratificado por bloque, no aleatorio puro sobre las 36
- **WHEN** el sistema selecciona qué preguntas analizar para una comparación
- **THEN** elige exactamente 1 pregunta de cada uno de los 6 bloques, preservando la representación
  proporcional de los 6 pesos de bloque (5/5/15/20/25/30%) en vez de un muestreo uniforme sobre las
  36 preguntas que podría dejar algún bloque sin representar

#### Scenario: Proveedor de IA intercambiable
- **WHEN** se configura un proveedor de IA distinto al principal (p. ej. OpenRouter en vez de Groq)
- **THEN** el orquestador realiza el análisis sin cambios en su propio código, dependiendo únicamente
  de la interfaz común de proveedor

### Requirement: Cálculo del resultado agregado con ponderación compuesta (bloques dentro de dimensiones)
El sistema SHALL calcular, para cada comparación completada, la media de cada una de las 6 dimensiones
como una media ponderada por bloques de preguntas — agrupando las preguntas analizadas (6 muestreadas,
1 por bloque, no las 36 completas) según a cuál de los 6 bloques del cuestionario pertenecen
(bloque 1 = preguntas 1–6, ..., bloque 6 = preguntas 31–36) — con pesos incrementales por bloque: 5%,
5%, 15%, 20%, 25%, 30%. El sistema SHALL calcular `compatibilidad_final` como suma ponderada de esas 6
medias de dimensión (ya ponderadas por bloque) usando los pesos por dimensión: emocional 20%, valores
25%, estilo comunicativo 10%, intereses 25%, madurez 10%, apertura 10%. El campo `compatibilidad` por
pregunta no participa en este cálculo; se conserva solo como dato informativo del detalle por
pregunta.

#### Scenario: Cálculo del score final con ponderación por bloques y dimensión
- **WHEN** las preguntas muestreadas de una comparación han sido puntuadas por el LLM
- **THEN** el sistema calcula, para cada dimensión, la media ponderada de sus 6 bloques (cada uno
  representado por 1 pregunta muestreada, 5/5/15/20/25/30%), combina esas 6 medias de dimensión con
  los pesos por dimensión (20/25/10/25/10/10) para obtener `compatibilidad_final`, redondea ambos a
  dos decimales, y persiste el resultado junto con los dos vectores de pesos usados (por bloque y por
  dimensión)

#### Scenario: El bloque de una pregunta se determina por su posición, no por cuántas la representen
- **WHEN** se determina a qué bloque pertenece una pregunta muestreada para el cálculo ponderado
- **THEN** el bloque se determina por la posición de la pregunta (1–6, 7–12, ..., 31–36), igual que
  cuando se analizaban las 36 completas — el cálculo no depende de si cada bloque está representado
  por 1 pregunta o por las 6
