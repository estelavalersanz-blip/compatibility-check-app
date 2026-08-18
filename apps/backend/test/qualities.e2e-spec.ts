import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Quality } from '@compatibility-check-app/shared-types';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

// El fake solo implementa `from('qualities').select(...).order(...)` — no el resto de la
// superficie real de `SupabaseClient`. Envolver el cast en una función con tipo de retorno
// declarado evita que `no-unsafe-*` se dispare (mismo patrón que `users-check-alias.e2e-spec.ts`).
function asSupabaseClient(fake: object): RealSupabaseClient {
  return fake as RealSupabaseClient;
}

const FIFTEEN_QUALITIES: Quality[] = Array.from({ length: 15 }, (_, index) => ({
  id: `quality-${index + 1}`,
  name: `Cualidad ${index + 1}`,
}));

/**
 * Sustituto en memoria de `SupabaseService` (patrón documentado en `test/setup/e2e-env.ts`): el
 * catálogo real se puebla con el seed (sección 18, todavía sin implementar), así que aquí se
 * modela una respuesta fija de 15 filas para verificar la forma/plumbing del endpoint, no el
 * contenido real del catálogo.
 */
function createFakeSupabaseService(qualities: Quality[]): Pick<SupabaseService, 'getClient'> {
  return {
    getClient: () =>
      asSupabaseClient({
        from: (table: string) => {
          if (table !== 'qualities') {
            throw new Error(`Tabla inesperada en el fake de test: ${table}`);
          }

          return {
            select: () => ({
              order: () => Promise.resolve({ data: qualities, error: null }),
            }),
          };
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

describe('GET /qualities (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    await app.close();
  });

  it('devuelve las 15 cualidades del catálogo', async () => {
    app = await buildApp(createFakeSupabaseService(FIFTEEN_QUALITIES));

    const response = await request(app.getHttpServer()).get('/qualities').expect(200);

    expect(response.body).toHaveLength(15);
    expect(response.body).toEqual(FIFTEEN_QUALITIES);
  });

  it('ignora la cabecera Authorization si llega — es pública, no pasa por ningún guard', async () => {
    app = await buildApp(createFakeSupabaseService(FIFTEEN_QUALITIES));

    const response = await request(app.getHttpServer())
      .get('/qualities')
      .set('Authorization', 'Bearer un-token-invalido-o-lo-que-sea')
      .expect(200);

    expect(response.body).toHaveLength(15);
  });
});
