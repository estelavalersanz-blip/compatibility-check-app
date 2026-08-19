import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AI_PROVIDER, AiProvider } from '../src/ai/ai-provider.interface';
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
}
interface FakeAnswer {
  questionId: number;
  question: string;
  answer: string;
}
interface FakeQuestionnaireRow {
  user_id: string;
  answers: FakeAnswer[];
}
interface FakeQuestionResultRow {
  comparison_id: string;
  question_id: number;
  result: unknown;
}
interface FakeAggregatedRow {
  comparison_id: string;
  result: unknown;
}
interface FakeAuthUser {
  id: string;
  email: string;
}

class FakeDatabase {
  comparisons: FakeComparisonRow[] = [];
  questionnaires: FakeQuestionnaireRow[] = [];
  questionResults: FakeQuestionResultRow[] = [];
  aggregatedResults: FakeAggregatedRow[] = [];
}

function comparisonsTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeComparisonRow, value: unknown) => ({
        maybeSingle: () =>
          Promise.resolve({
            data: db.comparisons.find((c) => c[column] === value) ?? null,
            error: null,
          }),
      }),
    }),
    update: (patch: Partial<FakeComparisonRow>) => ({
      eq: (column: keyof FakeComparisonRow, value: unknown) => ({
        select: () => ({
          single: () => {
            const index = db.comparisons.findIndex((c) => c[column] === value);
            if (index === -1) {
              return Promise.resolve({ data: null, error: { message: 'no encontrada' } });
            }
            db.comparisons[index] = { ...db.comparisons[index], ...patch };
            return Promise.resolve({ data: { id: db.comparisons[index].id }, error: null });
          },
        }),
      }),
    }),
  };
}

function questionnairesTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeQuestionnaireRow, value: unknown) => ({
        maybeSingle: () =>
          Promise.resolve({
            data: db.questionnaires.find((q) => q[column] === value) ?? null,
            error: null,
          }),
      }),
    }),
  };
}

function questionResultsTable(db: FakeDatabase) {
  return {
    delete: () => ({
      eq: (column: keyof FakeQuestionResultRow, value: unknown) => {
        db.questionResults = db.questionResults.filter((r) => r[column] !== value);
        return Promise.resolve({ error: null });
      },
    }),
    insert: (rows: FakeQuestionResultRow[]) => ({
      select: () => {
        db.questionResults.push(...rows);
        return Promise.resolve({ data: rows, error: null });
      },
    }),
  };
}

function aggregatedResultsTable(db: FakeDatabase) {
  return {
    delete: () => ({
      eq: (column: keyof FakeAggregatedRow, value: unknown) => {
        db.aggregatedResults = db.aggregatedResults.filter((r) => r[column] !== value);
        return Promise.resolve({ error: null });
      },
    }),
    insert: (row: FakeAggregatedRow) => ({
      select: () => {
        db.aggregatedResults.push(row);
        return Promise.resolve({ data: [row], error: null });
      },
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
          if (table === 'questionnaires') return questionnairesTable(db);
          if (table === 'comparison_question_results') return questionResultsTable(db);
          if (table === 'comparison_aggregated_results') return aggregatedResultsTable(db);
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

/** El proveedor de IA real nunca se llama en este spec (siempre se sustituye por este fake) —
 *  responde siempre con un lote válido, sin ejercitar aquí los reintentos/errores del LLM (ya
 *  cubiertos por `ai-orchestrator.service.spec.ts`). */
function createAlwaysValidAiProvider(): AiProvider {
  return {
    complete: () =>
      Promise.resolve(
        JSON.stringify(
          Array.from({ length: 6 }, () => ({
            pregunta: 'p',
            id_usuario_1: 'user-1',
            respuesta_usuario_1: 'r1',
            id_usuario_2: 'user-2',
            respuesta_usuario_2: 'r2',
            compatibilidad: 5,
            emocional: 5,
            valores: 5,
            estilo: 5,
            intereses: 5,
            madurez: 5,
            apertura: 5,
            explicación: 'e',
          })),
        ),
      ),
  };
}

async function buildApp(
  fakeSupabaseService: Pick<SupabaseService, 'getClient'>,
  aiProvider: AiProvider = createAlwaysValidAiProvider(),
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabaseService)
    .overrideProvider(AI_PROVIDER)
    .useValue(aiProvider)
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

function buildAnswers(): FakeAnswer[] {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Tiempo de espera agotado esperando el efecto en segundo plano');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const USER_A: FakeAuthUser = { id: 'auth-user-a', email: 'a@test.com' };
const AUTH_TOKENS = { 'jwt-a': USER_A };

describe('POST /comparisons/:id/reanalyze (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();
    db.questionnaires.push({ user_id: 'user-1', answers: buildAnswers() });
    db.questionnaires.push({ user_id: 'user-2', answers: buildAnswers() });
  });

  afterEach(async () => {
    await app.close();
  });

  it('sobre una comparación en error, despacha el análisis y la repite desde cero hasta completed', async () => {
    db.comparisons.push({
      id: 'cmp-1',
      requester_user_id: 'user-1',
      candidate_user_id: 'user-2',
      status: 'error',
    });
    // Restos de un intento anterior fallido — deben desaparecer, no acumularse.
    db.questionResults.push({ comparison_id: 'cmp-1', question_id: 1, result: { stale: true } });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/comparisons/cmp-1/reanalyze')
      .set('Authorization', 'Bearer jwt-a')
      .expect(201);

    expect(response.body).toEqual({ status: 'analyzing' });

    await waitFor(() => db.comparisons.find((c) => c.id === 'cmp-1')?.status === 'completed');

    // 6 preguntas muestreadas (1 por bloque), no las 36 completas — `createAlwaysValidAiProvider`
    // sirve un único lote de 6 porque solo se llama una vez a `complete()`.
    expect(db.questionResults).toHaveLength(6);
    expect(db.questionResults.every((r) => !(r.result as { stale?: boolean })?.stale)).toBe(true);
    expect(db.aggregatedResults).toHaveLength(1);
  });

  it('rechaza con 4xx si la comparación no está en estado error, sin tocar nada', async () => {
    db.comparisons.push({
      id: 'cmp-1',
      requester_user_id: 'user-1',
      candidate_user_id: 'user-2',
      status: 'completed',
    });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/comparisons/cmp-1/reanalyze')
      .set('Authorization', 'Bearer jwt-a');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(db.comparisons[0].status).toBe('completed');
  });

  it('rechaza con 4xx si la comparación no existe', async () => {
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/comparisons/no-existe/reanalyze')
      .set('Authorization', 'Bearer jwt-a');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it('rechaza con 401 sin sesión autenticada, sin tocar nada', async () => {
    db.comparisons.push({
      id: 'cmp-1',
      requester_user_id: 'user-1',
      candidate_user_id: 'user-2',
      status: 'error',
    });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    await request(app.getHttpServer()).post('/comparisons/cmp-1/reanalyze').expect(401);
    expect(db.comparisons[0].status).toBe('error');
  });
});
