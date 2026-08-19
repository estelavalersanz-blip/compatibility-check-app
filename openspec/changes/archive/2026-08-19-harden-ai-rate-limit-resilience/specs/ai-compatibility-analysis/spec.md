## ADDED Requirements

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
