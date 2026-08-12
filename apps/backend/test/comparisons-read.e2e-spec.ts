import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

function asSupabaseClient(fake: object): RealSupabaseClient {
  return fake as RealSupabaseClient;
}

interface FakeComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  status: string;
  shared_qualities_count: number;
}
interface FakeUserRow {
  id: string;
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
}
interface FakeAggregatedRow {
  comparison_id: string;
  result: unknown;
}
interface FakeQuestionResultRow {
  comparison_id: string;
  question_id: number;
  result: unknown;
}
interface FakeAuthUser {
  id: string;
  email: string;
}

/** Fake compartido por los dos endpoints de lectura de esta sección — mismo patrón que el resto de
 *  `*.e2e-spec.ts` de este proyecto. */
class FakeDatabase {
  comparisons: FakeComparisonRow[] = [];
  users: FakeUserRow[] = [];
  aggregatedResults: FakeAggregatedRow[] = [];
  questionResults: FakeQuestionResultRow[] = [];
}

interface ThenableSingle {
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
  then: (resolve: (result: { data: unknown; error: null }) => void) => void;
}

function comparisonsTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeComparisonRow, value: unknown): ThenableSingle => {
        const matches = db.comparisons.filter((c) => c[column] === value);
        return {
          maybeSingle: () => Promise.resolve({ data: matches[0] ?? null, error: null }),
          then: (resolve) => resolve({ data: matches, error: null }),
        };
      },
    }),
  };
}

function usersTable(db: FakeDatabase) {
  return {
    select: () => ({
      in: (column: keyof FakeUserRow, values: unknown[]) =>
        Promise.resolve({ data: db.users.filter((u) => values.includes(u[column])), error: null }),
    }),
  };
}

function aggregatedResultsTable(db: FakeDatabase) {
  return {
    select: () => ({
      in: (column: keyof FakeAggregatedRow, values: unknown[]) =>
        Promise.resolve({
          data: db.aggregatedResults.filter((a) => values.includes(a[column])),
          error: null,
        }),
    }),
  };
}

function questionResultsTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeQuestionResultRow, value: unknown) =>
        Promise.resolve({
          data: db.questionResults.filter((r) => r[column] === value),
          error: null,
        }),
    }),
  };
}

function createFakeSupabaseService(
  db: FakeDatabase,
  authUsersByToken: Record<string, FakeAuthUser>,
): Pick<SupabaseService, 'getClient'> {
  return {
    getClient: () =>
      asSupabaseClient({
        from: (table: string) => {
          if (table === 'comparisons') return comparisonsTable(db);
          if (table === 'users') return usersTable(db);
          if (table === 'comparison_aggregated_results') return aggregatedResultsTable(db);
          if (table === 'comparison_question_results') return questionResultsTable(db);
          throw new Error(`Tabla inesperada en el fake de test: ${table}`);
        },
        auth: {
          getUser: (token: string) => {
            const user = authUsersByToken[token];
            if (!user) {
              return Promise.resolve({ data: { user: null }, error: { message: 'invalid JWT' } });
            }
            return Promise.resolve({ data: { user }, error: null });
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

const USER_A: FakeAuthUser = { id: 'auth-user-a', email: 'a@test.com' };
const USER_B: FakeAuthUser = { id: 'auth-user-b', email: 'b@test.com' };
const AUTH_TOKENS = { 'jwt-a': USER_A, 'jwt-b': USER_B };

function fullComparisonResult(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    pregunta: '¿Pregunta?',
    id_usuario_1: USER_A.id,
    respuesta_usuario_1: 'RESPUESTA SECRETA DE A',
    id_usuario_2: 'candidate-1',
    respuesta_usuario_2: 'RESPUESTA SECRETA DEL CANDIDATO',
    compatibilidad: 7.5,
    emocional: 7.5,
    valores: 7.5,
    estilo: 7.5,
    intereses: 7.5,
    madurez: 7.5,
    apertura: 7.5,
    explicación: 'Justificación de la IA.',
    ...overrides,
  };
}

describe('Lecturas de comparisons (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/me/comparisons', () => {
    it('devuelve estado, datos del candidato y el agregado solo cuando está completed', async () => {
      db.comparisons.push(
        {
          id: 'cmp-completed',
          requester_user_id: USER_A.id,
          candidate_user_id: 'candidate-1',
          status: 'completed',
          shared_qualities_count: 3,
        },
        {
          id: 'cmp-analyzing',
          requester_user_id: USER_A.id,
          candidate_user_id: 'candidate-2',
          status: 'analyzing',
          shared_qualities_count: 2,
        },
      );
      db.users.push(
        {
          id: 'candidate-1',
          name: 'Ada',
          alias: 'ada',
          photo_url: 'https://storage.test/ada.png',
          questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'candidate-2',
          name: 'Bea',
          alias: 'bea',
          photo_url: null,
          questionnaire_completed_at: '2024-01-02T00:00:00.000Z',
        },
      );
      db.aggregatedResults.push({
        comparison_id: 'cmp-completed',
        result: {
          emocional: 8,
          valores: 8,
          estilo: 8,
          intereses: 8,
          madurez: 8,
          apertura: 8,
          compatibilidad_final: 8,
          weights: { dimension: {}, block: [0, 0, 0, 0, 0, 0] },
        },
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/comparisons')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{
        id: string;
        status: string;
        candidate: { id: string; alias: string; photoUrl: string | null };
        sharedQualitiesCount: number;
        result: { compatibilidad_final: number } | null;
      }>;
      expect(body).toHaveLength(2);

      const completed = body.find((c) => c.id === 'cmp-completed');
      expect(completed?.status).toBe('completed');
      expect(completed?.candidate).toMatchObject({ id: 'candidate-1', alias: 'ada' });
      expect(completed?.sharedQualitiesCount).toBe(3);
      expect(completed?.result?.compatibilidad_final).toBe(8);

      const analyzing = body.find((c) => c.id === 'cmp-analyzing');
      expect(analyzing?.status).toBe('analyzing');
      expect(analyzing?.candidate).toMatchObject({ id: 'candidate-2', alias: 'bea' });
      expect(analyzing?.result).toBeNull();
    });

    it('con menos de 3 comparaciones, devuelve solo las que existen (sin rellenar huecos)', async () => {
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: USER_A.id,
        candidate_user_id: 'candidate-1',
        status: 'pending',
        shared_qualities_count: 1,
      });
      db.users.push({
        id: 'candidate-1',
        name: 'Ada',
        alias: 'ada',
        photo_url: null,
        questionnaire_completed_at: '2024-01-01T00:00:00.000Z',
      });
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/comparisons')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('sin ninguna comparación, devuelve un array vacío', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/users/me/comparisons')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/users/me/comparisons').expect(401);
    });
  });

  describe('GET /comparisons/:id/detail', () => {
    beforeEach(() => {
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: USER_A.id,
        candidate_user_id: 'candidate-1',
        status: 'completed',
        shared_qualities_count: 3,
      });
      // Insertadas fuera de orden a propósito, para comprobar que la respuesta las ordena.
      db.questionResults.push(
        {
          comparison_id: 'cmp-1',
          question_id: 3,
          result: fullComparisonResult({ pregunta: 'P3' }),
        },
        {
          comparison_id: 'cmp-1',
          question_id: 1,
          result: fullComparisonResult({ pregunta: 'P1' }),
        },
        {
          comparison_id: 'cmp-1',
          question_id: 2,
          result: fullComparisonResult({ pregunta: 'P2' }),
        },
      );
    });

    it('devuelve el detalle ordenado por pregunta, sin respuestas de usuario en ningún campo', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/comparisons/cmp-1/detail')
        .set('Authorization', 'Bearer jwt-a')
        .expect(200);

      const body = response.body as Array<{
        questionId: number;
        pregunta: string;
        compatibilidad: number;
      }>;
      expect(body.map((r) => r.questionId)).toEqual([1, 2, 3]);
      expect(body.map((r) => r.pregunta)).toEqual(['P1', 'P2', 'P3']);
      expect(body[0]).toMatchObject({
        compatibilidad: 7.5,
        emocional: 7.5,
        explicación: 'Justificación de la IA.',
      });

      const raw = JSON.stringify(response.body);
      expect(raw).not.toContain('respuesta_usuario');
      expect(raw).not.toContain('RESPUESTA SECRETA');
      expect(raw).not.toContain('id_usuario');
    });

    it('rechaza con 4xx (no encontrada) si la comparación no es del usuario autenticado', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/comparisons/cmp-1/detail')
        .set('Authorization', 'Bearer jwt-b');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rechaza con 4xx si la comparación no existe', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/comparisons/no-existe/detail')
        .set('Authorization', 'Bearer jwt-a');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rechaza con 4xx si la comparación todavía no está completed', async () => {
      db.comparisons[0].status = 'analyzing';
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      const response = await request(app.getHttpServer())
        .get('/comparisons/cmp-1/detail')
        .set('Authorization', 'Bearer jwt-a');

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it('rechaza con 401 sin sesión autenticada', async () => {
      app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

      await request(app.getHttpServer()).get('/comparisons/cmp-1/detail').expect(401);
    });
  });
});
