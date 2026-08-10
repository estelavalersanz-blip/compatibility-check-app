## ADDED Requirements

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

#### Scenario: Detalle expandible por pregunta
- **WHEN** el usuario expande una tarjeta de resultado
- **THEN** el sistema muestra el detalle de las 36 preguntas comparadas con la explicación asociada a
  cada una

#### Scenario: Menos de 3 candidatos disponibles
- **WHEN** al usuario se le asignaron menos de 3 comparaciones por falta de candidatos en el pool
- **THEN** el dashboard muestra solo las tarjetas correspondientes a las comparaciones existentes, sin
  simular candidatos inexistentes

### Requirement: Botón de recalcular compatibilidad en el dashboard
El sistema SHALL mostrar en el dashboard un botón de "recalcular compatibilidad", habilitado únicamente
cuando el perfil del usuario está marcado como pendiente de recalcular (ver `candidate-matching`), y
SHALL refrescar el gráfico y las tarjetas con los nuevos resultados una vez completado el recálculo.

#### Scenario: Botón deshabilitado sin cambios pendientes
- **WHEN** el usuario no ha editado sus respuestas ni sus cualidades desde el último cálculo
- **THEN** el botón de recalcular compatibilidad aparece deshabilitado u oculto en el dashboard

#### Scenario: Botón habilitado tras editar respuestas o cualidades
- **WHEN** el perfil del usuario está marcado como pendiente de recalcular
- **THEN** el botón de recalcular compatibilidad aparece habilitado en el dashboard

#### Scenario: El dashboard refleja el recálculo
- **WHEN** el usuario activa el recálculo y el nuevo análisis termina
- **THEN** el dashboard muestra las nuevas tarjetas y gráficos con los resultados actualizados,
  reemplazando los anteriores

### Requirement: Enrutamiento de la página principal según el estado del usuario
El sistema SHALL mostrar como página principal el cuestionario mientras el usuario autenticado no lo
haya completado y enviado nunca, y SHALL mostrar como página principal el dashboard de resultados una
vez completado.

#### Scenario: Página principal antes de completar el cuestionario
- **WHEN** un usuario autenticado que nunca completó su cuestionario abre la aplicación
- **THEN** la página principal mostrada es el formulario del cuestionario

#### Scenario: Página principal tras completar el cuestionario
- **WHEN** un usuario autenticado que ya completó su cuestionario abre la aplicación
- **THEN** la página principal mostrada es el dashboard de resultados, independientemente de si tiene
  comparaciones pendientes de análisis o de recálculo
