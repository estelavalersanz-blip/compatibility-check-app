## MODIFIED Requirements

### Requirement: Enrutamiento de la página principal según el estado del usuario
El sistema SHALL mostrar como página principal el cuestionario mientras el usuario autenticado (con
perfil ya completado — ver `user-registration`, "Sin perfil, cualquier ruta redirige...") no haya
completado y enviado nunca su cuestionario, y SHALL mostrar como página principal el dashboard de
resultados una vez completado. La comprobación de perfil tiene prioridad sobre esta: sin perfil, la
página principal siempre es completar perfil paso 1, nunca el cuestionario ni el dashboard. El sistema
SHALL ofrecer, además, un punto de entrada permanente a esta misma resolución desde el logo/marca de
la cabecera compartida de la aplicación autenticada, visible y activo en cualquier pantalla.

#### Scenario: Página principal antes de completar el cuestionario
- **WHEN** un usuario autenticado, con perfil ya completado, que nunca completó su cuestionario abre la
  aplicación
- **THEN** la página principal mostrada es el formulario del cuestionario

#### Scenario: Página principal tras completar el cuestionario
- **WHEN** un usuario autenticado que ya completó su cuestionario abre la aplicación
- **THEN** la página principal mostrada es el dashboard de resultados, independientemente de si tiene
  comparaciones pendientes de análisis o de recálculo

#### Scenario: Acceso a la pantalla principal desde el logo/marca de la cabecera
- **WHEN** un usuario autenticado, en cualquier pantalla de la aplicación (incluyendo Configuración o
  Chats), pulsa el logo o el texto "AfinIA" de la cabecera compartida
- **THEN** el sistema navega a la página principal y la resuelve con el mismo criterio de estado
  (completar perfil, cuestionario o dashboard) que al abrir la aplicación, sin una ruta ni una lógica
  de resolución propias distintas de las ya existentes
