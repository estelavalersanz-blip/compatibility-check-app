import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

interface FakeUserRow {
  id: string;
  alias: string;
}

interface FakeAuthUser {
  id: string;
  email: string;
}

interface FakeQueryBuilder {
  select: () => FakeQueryBuilder;
  eq: (column: keyof FakeUserRow, value: string) => FakeQueryBuilder;
  neq: (column: keyof FakeUserRow, value: string) => FakeQueryBuilder;
  maybeSingle: () => Promise<{ data: FakeUserRow | null; error: null }>;
}

// El fake solo implementa `from(...)`/`auth.getUser(...)` — no el resto de la superficie real de
// `SupabaseClient`. Envolver el cast en una función con tipo de retorno declarado (en vez de un
// `as` suelto en la asignación) evita que `no-unsafe-*` se dispare y que `eslint --fix` lo
// reintroduzca después (mismo patrón que `idOf(...)` en `test/integration/rls-policies...`).
function asSupabaseClient(fake: object): RealSupabaseClient {
  return fake as RealSupabaseClient;
}

/**
 * Sustituto en memoria de `SupabaseService` (patrón documentado en `test/setup/e2e-env.ts`): los
 * tests e2e no dependen de Docker ni de credenciales reales, así que en vez de golpear Postgres se
 * modela el único registro `users` relevante para cada escenario y se evalúan los filtros
 * `eq`/`neq` encadenados igual que lo haría PostgREST.
 */
function createFakeSupabaseService(
  existingRow: FakeUserRow | null,
  authUser: FakeAuthUser | null,
): Pick<SupabaseService, 'getClient'> {
  return {
    getClient: () =>
      asSupabaseClient({
        from: (table: string) => {
          if (table !== 'users') {
            throw new Error(`Tabla inesperada en el fake de test: ${table}`);
          }

          const filters: Array<{ column: keyof FakeUserRow; op: 'eq' | 'neq'; value: string }> = [];
          const builder: FakeQueryBuilder = {
            select: () => builder,
            eq: (column, value) => {
              filters.push({ column, op: 'eq', value });
              return builder;
            },
            neq: (column, value) => {
              filters.push({ column, op: 'neq', value });
              return builder;
            },
            maybeSingle: () => {
              const matches =
                existingRow !== null &&
                filters.every((f) =>
                  f.op === 'eq'
                    ? existingRow[f.column] === f.value
                    : existingRow[f.column] !== f.value,
                );
              return Promise.resolve({ data: matches ? existingRow : null, error: null });
            },
          };

          return builder;
        },
        auth: {
          getUser: (token: string) => {
            if (authUser && token === 'valid-jwt') {
              return Promise.resolve({ data: { user: authUser }, error: null });
            }
            return Promise.resolve({
              data: { user: null },
              error: { message: 'invalid JWT' },
            });
          },
        },
      }),
  };
}

async function buildApp(
  fakeSupabaseService: Pick<SupabaseService, 'getClient'>,
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabaseService)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

describe('GET /users/check-alias (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('devuelve available=true cuando el alias no existe en BD', async () => {
    app = await buildApp(createFakeSupabaseService(null, null));

    const response = await request(app.getHttpServer())
      .get('/users/check-alias?alias=libre')
      .expect(200);

    expect(response.body).toEqual({ available: true });
  });

  it('devuelve available=false cuando el alias ya lo tiene otro usuario', async () => {
    app = await buildApp(createFakeSupabaseService({ id: 'other-user-id', alias: 'tomado' }, null));

    const response = await request(app.getHttpServer())
      .get('/users/check-alias?alias=tomado')
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it('sin autenticar, el alias de otro usuario sigue contando como ocupado', async () => {
    app = await buildApp(createFakeSupabaseService({ id: 'other-user-id', alias: 'tomado' }, null));

    const response = await request(app.getHttpServer())
      .get('/users/check-alias?alias=tomado')
      .set('Authorization', 'Bearer un-token-cualquiera')
      .expect(200);

    expect(response.body).toEqual({ available: false });
  });

  it('excluye al propio usuario autenticado: su alias actual no cuenta como ocupado', async () => {
    const self: FakeAuthUser = { id: 'self-id', email: 'yo@test.com' };
    app = await buildApp(createFakeSupabaseService({ id: 'self-id', alias: 'mi-alias' }, self));

    const response = await request(app.getHttpServer())
      .get('/users/check-alias?alias=mi-alias')
      .set('Authorization', 'Bearer valid-jwt')
      .expect(200);

    expect(response.body).toEqual({ available: true });
  });

  it('rechaza con 400 si falta el parámetro alias', async () => {
    app = await buildApp(createFakeSupabaseService(null, null));

    await request(app.getHttpServer()).get('/users/check-alias').expect(400);
  });
});
