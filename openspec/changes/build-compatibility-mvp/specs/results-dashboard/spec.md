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

#### Scenario: Detalle expandible por pregunta, sin exponer respuestas
- **WHEN** el usuario expande una tarjeta de resultado
- **THEN** el sistema muestra, para cada una de las 36 preguntas, el texto de la pregunta, sus
  puntuaciones por dimensión y la explicación de la IA, **sin incluir en ningún caso el texto de la
  respuesta propia ni la del candidato**

#### Scenario: Menos de 3 candidatos disponibles
- **WHEN** al usuario se le asignaron menos de 3 comparaciones por falta de candidatos en el pool
- **THEN** el dashboard muestra solo las tarjetas correspondientes a las comparaciones existentes, sin
  simular candidatos inexistentes

### Requirement: Las respuestas de los usuarios nunca se exponen entre sí
El sistema SHALL impedir que un usuario pueda ver el texto de las respuestas de otro usuario a través
del dashboard o de cualquier endpoint que consuma, incluyendo el propio usuario que las solicita sobre
una comparación ajena. Solo las puntuaciones (por dimensión y general) y, opcionalmente, la explicación
de la IA por pregunta son visibles.

#### Scenario: El endpoint de detalle no devuelve las respuestas
- **WHEN** el frontend solicita `GET /comparisons/:id/detail`
- **THEN** la respuesta no contiene ningún campo con el texto de las respuestas de ninguno de los dos
  usuarios de esa comparación, aunque el backend conserve ese dato internamente para el registro del
  análisis

#### Scenario: Ni siquiera se muestra la propia respuesta en el detalle de una comparación
- **WHEN** el usuario expande el detalle de una comparación con un candidato
- **THEN** tampoco ve su propia respuesta a cada pregunta en esa vista — el detalle es exclusivamente
  de puntuaciones y explicación, igual para ambas partes de la comparación

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
El sistema SHALL mostrar como página principal el cuestionario mientras el usuario autenticado (con
perfil ya completado — ver `user-registration`, "Sin perfil, cualquier ruta redirige...") no haya
completado y enviado nunca su cuestionario, y SHALL mostrar como página principal el dashboard de
resultados una vez completado. La comprobación de perfil tiene prioridad sobre esta: sin perfil, la
página principal siempre es completar perfil paso 1, nunca el cuestionario ni el dashboard.

#### Scenario: Página principal antes de completar el cuestionario
- **WHEN** un usuario autenticado, con perfil ya completado, que nunca completó su cuestionario abre la
  aplicación
- **THEN** la página principal mostrada es el formulario del cuestionario

#### Scenario: Página principal tras completar el cuestionario
- **WHEN** un usuario autenticado que ya completó su cuestionario abre la aplicación
- **THEN** la página principal mostrada es el dashboard de resultados, independientemente de si tiene
  comparaciones pendientes de análisis o de recálculo
