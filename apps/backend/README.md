# AfinIA — Backend

API [NestJS](https://nestjs.com/) del proyecto AfinIA (TFM): perfiles, cuestionario de
compatibilidad, selección de candidatos, orquestación de IA y chat interno. Ver el
[README de la raíz](../../README.md) para el contexto general del monorepo, y
`openspec/changes/build-compatibility-mvp/design.md` para las decisiones de arquitectura.

## Configuración

Copia `.env.example` a `.env` y rellena los valores reales (nunca se commitean). En producción
(Render) se configuran como variables de entorno de la plataforma.

## Scripts

```bash
npm run start:dev        # watch mode
npm run build             # build de producción (dist/)
npm run start:prod        # ejecuta el build

npm run lint               # ESLint

npm test                   # tests unitarios (*.spec.ts) — sin Docker
npm run test:e2e            # tests e2e contra la app levantada en memoria (*.e2e-spec.ts)
npm run test:integration    # tests de integración (*.integration-spec.ts) — requiere el stack
                             # local de Supabase corriendo (`npx supabase start` desde la raíz del
                             # repo) y sus credenciales exportadas, ver README de la raíz
```

## Piezas clave

- **`src/logger/`**: logger estructurado único (`nestjs-pino`), con transport condicional a Better
  Stack/Logtail vía `LOGTAIL_SOURCE_TOKEN`. Nunca usar `console.log`.
- **`src/cqrs/`**: `LoggingCommandBus` — sustituye al `CommandBus` de `@nestjs/cqrs` por defecto,
  registrando automáticamente inicio/fin/error de cada Command con un id de correlación.
- **`test/setup/`**, **`test/factories/`**: infraestructura de tests de integración (pool de cuentas
  `auth.users`, reset de tablas de dominio, factories de fixtures) — ver
  `design.md`, decisión 11.
