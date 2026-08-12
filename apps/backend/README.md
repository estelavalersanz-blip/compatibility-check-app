# AfinIA — Backend

API [NestJS](https://nestjs.com/) del proyecto AfinIA (TFM): perfiles, cuestionario de
compatibilidad, selección de candidatos, orquestación de IA y chat interno. Ver el
[README de la raíz](../../README.md) para el contexto general del monorepo, y
`openspec/changes/build-compatibility-mvp/design.md` para las decisiones de arquitectura.

## Configuración

Copia `.env.example` a `.env` y rellena los valores reales (nunca se commitean). En producción
(Render) se configuran como variables de entorno de la plataforma. `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` son obligatorias — la app falla al arrancar sin ellas (`SupabaseService`,
ver más abajo); para desarrollo local, usa las del stack local (`npx supabase status`, ver README de
la raíz).

## Scripts

```bash
npm run start:dev        # watch mode
npm run build             # build de producción (dist/)
npm run start:prod        # ejecuta el build

npm run lint               # ESLint

npm test                   # tests unitarios (*.spec.ts) — sin Docker
npm run test:e2e            # tests e2e contra la app levantada en memoria (*.e2e-spec.ts), sin
                             # Docker — corre en CI junto a los unitarios (ver ci.yml)
npm run test:integration    # tests de integración (*.integration-spec.ts) — requiere el stack
                             # local de Supabase corriendo (`npx supabase start` desde la raíz del
                             # repo) y sus credenciales exportadas, ver README de la raíz
```

## Piezas clave

- **`src/logger/`**: logger estructurado único (`nestjs-pino`), con transport condicional a Better
  Stack/Logtail vía `LOGTAIL_SOURCE_TOKEN`. Nunca usar `console.log`.
- **`src/cqrs/`**: `LoggingCommandBus` — sustituye al `CommandBus` de `@nestjs/cqrs` por defecto,
  registrando automáticamente inicio/fin/error de cada Command con un id de correlación.
- **`src/supabase/`**: `SupabaseService` — única puerta de acceso a datos con la `service_role` key
  (módulo `@Global()`); el resto de servicios de dominio dependen de esta clase, nunca de
  `@supabase/supabase-js` directamente.
- **`src/auth/`**: `SupabaseAuthGuard` (módulo `@Global()`) — valida el JWT de Supabase
  (`Authorization: Bearer ...`) delegando en `supabase.auth.getUser(token)`, sin verificar la firma
  a mano ni gestionar un secreto propio. Se aplica con `@UseGuards(SupabaseAuthGuard)` a cada
  endpoint protegido a medida que se implementa (perfil, cuestionario, comparaciones).
- **`src/users/`**: por ahora solo `GET /users/check-alias` — deliberadamente público (sin el
  guard), comprueba disponibilidad de alias excluyendo al propio usuario cuando la petición trae un
  JWT válido. Se amplía en secciones posteriores con la creación/edición de perfil.
- **`src/qualities/`**: `GET /qualities` — público, devuelve el catálogo de 15 cualidades
  personales (`Quality[]` de `@compatibility-check-app/shared-types`, primer consumo real de ese
  paquete desde el backend). El catálogo lo puebla el script de seed (sección 18); este módulo solo
  lo expone.
- **`test/setup/`**, **`test/factories/`**: infraestructura de tests de integración (pool de cuentas
  `auth.users`, reset de tablas de dominio, factories de fixtures) — ver `design.md`, decisión 11.
  `test/setup/e2e-env.ts` da credenciales ficticias a los tests e2e (que no deben depender de
  Docker) para que `AppModule` pueda arrancar igualmente.
