## MODIFIED Requirements

### Requirement: Visualización de las comparaciones de un usuario
El sistema SHALL mostrar al usuario, tras completar su cuestionario, el estado y resultado de cada una
de sus comparaciones con foto, alias y score del candidato correspondiente.

#### Scenario: Dashboard con comparaciones completadas
- **WHEN** las comparaciones de un usuario han terminado su análisis
- **THEN** el sistema muestra una tarjeta por comparación con la foto y alias del candidato, el score
  final y un gráfico con el desglose de las 6 dimensiones, ordenadas de mayor a menor
  `compatibilidad_final`

#### Scenario: Estado de procesamiento antes de completarse
- **WHEN** el usuario consulta el resultado mientras alguna comparación sigue en `pending` o
  `analyzing`
- **THEN** el sistema muestra el progreso (cuántas de las comparaciones están completadas) en vez del
  resultado final de las que faltan

#### Scenario: Detalle expandible por pregunta, sin exponer respuestas
- **WHEN** el usuario expande una tarjeta de resultado
- **THEN** el sistema muestra, para cada una de las preguntas analizadas (6 muestreadas por
  comparación — 1 por bloque —, no las 36 completas del cuestionario), el texto de la pregunta, sus
  puntuaciones por dimensión y la explicación de la IA, **sin incluir en ningún caso el texto de la
  respuesta propia ni la del candidato**

#### Scenario: Menos de 3 candidatos disponibles
- **WHEN** al usuario se le asignaron menos de 3 comparaciones por falta de candidatos en el pool
- **THEN** el dashboard muestra solo las tarjetas correspondientes a las comparaciones existentes, sin
  simular candidatos inexistentes
