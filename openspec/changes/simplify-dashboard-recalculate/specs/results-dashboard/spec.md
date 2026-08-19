## MODIFIED Requirements

### Requirement: Visualización de las comparaciones de un usuario
El sistema SHALL mostrar al usuario, tras completar su cuestionario, el estado y resultado de cada una
de sus comparaciones con foto, alias y score del candidato correspondiente, y SHALL mantener esa vista
actualizada por sí solo mientras el análisis de alguna comparación siga en curso, sin exigir que la
persona recargue la página a mano.

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

#### Scenario: El dashboard se actualiza solo cuando el análisis termina, sin recargar la página
- **WHEN** el usuario tiene el dashboard abierto con alguna comparación todavía en `pending` o
  `analyzing` (por ejemplo, justo después de activar un recálculo desde Configuración)
- **THEN** el sistema vuelve a consultar el estado de las comparaciones periódicamente por su cuenta, y
  la tarjeta correspondiente pasa de mostrar el spinner de análisis a mostrar el resultado final en
  cuanto está disponible, sin que la persona tenga que recargar la página

#### Scenario: Detalle expandible por pregunta, sin exponer respuestas
- **WHEN** el usuario expande una tarjeta de resultado
- **THEN** el sistema muestra, para cada una de las preguntas analizadas, el texto de la pregunta, sus
  puntuaciones por dimensión y la explicación de la IA, **sin incluir en ningún caso el texto de la
  respuesta propia ni la del candidato**

#### Scenario: Menos de 3 candidatos disponibles
- **WHEN** al usuario se le asignaron menos de 3 comparaciones por falta de candidatos en el pool
- **THEN** el dashboard muestra solo las tarjetas correspondientes a las comparaciones existentes, sin
  simular candidatos inexistentes

## REMOVED Requirements

### Requirement: Botón de recalcular compatibilidad en el dashboard
**Reason**: redundante con los atajos ya existentes en `user-settings` (banner "Recalcular
compatibilidad ahora" tras guardar cualidades distintas, y "Guardar y recalcular compatibilidad" al
editar el cuestionario) — ambos llaman directamente a `POST /users/me/recalculate` sin depender de
ningún control del dashboard. Tenerlo también aquí, casi siempre deshabilitado, resultaba redundante
(feedback explícito de la usuaria, 2026-08-19).
**Migration**: ninguna — el endpoint `POST /users/me/recalculate` (`candidate-matching`, "Recálculo
manual de las propias comparaciones") no cambia; solo deja de haber un control de UI para él en esta
pantalla en concreto.
