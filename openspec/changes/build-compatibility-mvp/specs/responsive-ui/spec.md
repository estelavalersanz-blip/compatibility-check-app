## ADDED Requirements

### Requirement: Interfaz completamente responsive
El sistema SHALL adaptar toda la interfaz (autenticación, registro, cuestionario, procesando,
dashboard, configuración) a móvil (<768px), tablet (768–991px) y escritorio (≥992px) usando el grid y
las utilidades responsive de Bootstrap 5, sin depender de una app nativa, ya que el acceso es
exclusivamente web.

#### Scenario: Cabecera en móvil
- **WHEN** la aplicación se visualiza en un viewport de ancho móvil (<768px)
- **THEN** la cabecera colapsa a un menú desplegable (hamburguesa) que sigue dando acceso a
  configuración y cerrar sesión

#### Scenario: Cuestionario sin scroll horizontal en móvil
- **WHEN** el formulario del cuestionario de 36 preguntas se visualiza en un viewport móvil
- **THEN** el contenido ocupa el ancho disponible sin generar scroll horizontal ni desbordamiento

#### Scenario: Tarjetas del dashboard apiladas en móvil
- **WHEN** el dashboard de resultados se visualiza en un viewport móvil
- **THEN** las tarjetas de comparación se muestran apiladas en una sola columna en vez de las 3 columnas
  usadas en escritorio

#### Scenario: Gráfico radar se adapta al contenedor
- **WHEN** el gráfico radar de una tarjeta de resultado se visualiza en cualquier tamaño de viewport
- **THEN** el gráfico se redimensiona al ancho de su contenedor sin desbordar ni requerir scroll
  horizontal
