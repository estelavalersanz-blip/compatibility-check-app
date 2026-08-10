## ADDED Requirements

### Requirement: Catálogo inicial de cualidades
El sistema SHALL disponer de un catálogo fijo de 15 cualidades personales precargado antes de que
cualquier usuario pueda registrarse.

#### Scenario: Ejecución del seed de cualidades
- **WHEN** se ejecuta el script de seed sobre una base de datos vacía
- **THEN** la tabla de cualidades queda poblada con exactamente 15 registros, disponibles para el
  formulario de registro

### Requirement: Pool de usuarios sintéticos precargados
El sistema SHALL disponer de 10 usuarios sintéticos (definidos en `supabase/seed/seed-users.json`),
cada uno con su propia cuenta de autenticación, alias único, nombre, foto genérica, 5 cualidades
elegidas y cuestionario de 36 preguntas ya completado, con variedad deliberada de arquetipos de
personalidad y de solapamiento de cualidades entre sí, para permitir probar el flujo de comparación de
forma realista sin depender de usuarios reales.

#### Scenario: Ejecución del seed de usuarios
- **WHEN** se ejecuta el script de seed
- **THEN** se crea, para cada uno de los 10 perfiles de `seed-users.json`, una cuenta de autenticación
  (con contraseña aleatoria no comunicada) y su perfil asociado con alias único, foto genérica (avatar
  ilustrado generado de forma determinista, no un rostro real) ya subida a almacenamiento, sus 5
  cualidades y su cuestionario completo, quedando disponibles como candidatos para nuevos usuarios

#### Scenario: Reproducibilidad sin gasto de cuota de IA
- **WHEN** se ejecuta el seed repetidamente durante el desarrollo (p. ej. tras resetear la base de
  datos)
- **THEN** los datos insertados son siempre los mismos (cuestionarios y cualidades congelados en un
  fichero de datos), sin realizar llamadas al proveedor de IA durante la ejecución del seed
