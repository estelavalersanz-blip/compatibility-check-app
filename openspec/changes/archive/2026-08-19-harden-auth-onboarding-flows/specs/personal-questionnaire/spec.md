## MODIFIED Requirements

### Requirement: Presentación como wizard de 6 pasos agrupados por bloque de peso
El sistema SHALL presentar las 36 preguntas agrupadas en 6 bloques de 6 preguntas cada uno (bloque 1 =
preguntas 1-6, ..., bloque 6 = preguntas 31-36), mostrando **un único bloque a la vez** (nunca los 6
simultáneamente en la misma pantalla) como pasos de un wizard, y SHALL dar al bloque activo un estilo
visual (gradiente de fondo) que refleje su peso relativo en el resultado final, de forma que los bloques
con más peso se distingan visualmente de los de menos peso. Los controles para avanzar o retroceder de
bloque SHALL ser distintos, en posición y en función, del control de envío final del cuestionario — no
SHALL compartir el mismo control ni cambiar su función según el bloque en el que se esté.

#### Scenario: Bloques de igual peso se ven igual
- **WHEN** se muestra el bloque 1 y, en otro momento, el bloque 2 (ambos con el mismo peso del 5%)
- **THEN** ambos usan exactamente el mismo estilo de fondo, sin diferencias visuales entre ellos

#### Scenario: A mayor peso, estilo visualmente más intenso
- **WHEN** se comparan los 6 bloques entre sí a lo largo del wizard
- **THEN** el estilo de fondo progresa de forma perceptible desde el bloque de menor peso (5%) hasta el
  de mayor peso (30%), sin que ningún bloque de menor peso se muestre con un estilo más intenso que uno
  de mayor peso

#### Scenario: Nunca se muestra más de un bloque a la vez
- **WHEN** el usuario está viendo cualquier bloque del cuestionario
- **THEN** el sistema no monta ni muestra el contenido de los otros 5 bloques en la misma pantalla

#### Scenario: Avanzar de bloque no exige haberlo completado
- **WHEN** el usuario avanza al siguiente bloque sin haber respondido todas las preguntas del bloque
  actual
- **THEN** el sistema permite el avance, pero sigue exigiendo las 36 respuestas completas para poder
  enviar el cuestionario

#### Scenario: Volver a revisar y editar un bloque anterior
- **WHEN** el usuario, estando en un bloque posterior, navega hacia atrás (paso a paso o saltando
  directamente) hasta un bloque ya visitado anteriormente
- **THEN** el sistema muestra ese bloque con sus respuestas ya guardadas, permite editarlas, y ofrece una
  forma de volver directamente al bloque más avanzado que el usuario había alcanzado

#### Scenario: No se puede saltar a un bloque aún no alcanzado
- **WHEN** el usuario intenta navegar directamente a un bloque posterior al más avanzado que ha
  alcanzado (por ejemplo, saltar del bloque 2 al bloque 5 sin haber pasado por el 3 y el 4)
- **THEN** el sistema no permite ese salto; solo se puede avanzar bloque a bloque

#### Scenario: El control de envío final solo aparece en el último bloque
- **WHEN** el usuario está en cualquier bloque anterior al último
- **THEN** el control de envío/guardado final del cuestionario no se muestra; solo están disponibles los
  controles de avanzar/retroceder de bloque

#### Scenario: Navegación de bloque visualmente distinguible de la navegación de preguntas
- **WHEN** el usuario ve los controles de navegación del bloque activo
- **THEN** los controles de avanzar/retroceder de bloque son visualmente distintos de los de
  avanzar/retroceder entre las preguntas del propio bloque, aunque compartan la misma zona de la
  pantalla
