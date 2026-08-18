import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AI_PROVIDER } from '../src/ai/ai-provider.interface';
import { OpenRouterProvider } from '../src/ai/openrouter.provider';
import { SupabaseService } from '../src/supabase/supabase.service';

/**
 * Cierra el hueco de la spec `ai-compatibility-analysis` ("Proveedor de IA intercambiable"):
 * `comparisons-reanalyze.e2e-spec.ts` ya prueba el flujo completo de análisis end-to-end, pero
 * siempre con `AI_PROVIDER` sustituido por un fake genérico (`createAlwaysValidAiProvider`) — nunca
 * con una implementación real de `AiProvider` detrás. La intercambiabilidad Groq↔OpenRouter
 * (design.md, decisión 4) hasta ahora solo estaba respaldada por arquitectura (DI + paridad de test
 * suites unitarias entre `groq.provider.spec.ts` y `openrouter.provider.spec.ts`), no por un test
 * que vincule de verdad `OpenRouterProvider` en el módulo y ejecute el análisis con él.
 *
 * Aquí `AI_PROVIDER` se sobrescribe con `.useClass(OpenRouterProvider)` (no `.useValue(...)`): Nest
 * instancia la clase real, resolviendo su único dependency (`PinoLogger`) desde el propio
 * `AppModule` — es la misma instanciación que ya ocurre hoy para el registro `OpenRouterProvider`
 * de `ai.module.ts` (inactivo mientras `AI_PROVIDER` no apunte a él), solo que aquí SÍ queda
 * vinculada al token activo. `OpenRouterProvider` no recibe ningún cliente HTTP inyectado — llama a
 * `fetch` global directamente, igual que `groq.provider.ts` — así que el "cliente HTTP fake" no es
 * un parámetro de constructor sino el mismo mock de `global.fetch` que usa
 * `openrouter.provider.spec.ts` para no golpear la red real, reutilizado tal cual aquí.
 */

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

// Mismas cuatro tablas y misma forma que en `comparisons-reanalyze.e2e-spec.ts` — el análisis de IA
// toca exactamente las mismas, independientemente de qué `AiProvider` esté detrás.
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

/** Un lote de 6 resultados válidos (mismo formato que `createAlwaysValidAiProvider` en
 *  `comparisons-reanalyze.e2e-spec.ts`) envuelto en la forma real de una respuesta de OpenRouter
 *  (`choices[0].message.content`, ver `openrouter.provider.ts`) — el contenido en sí no se valida
 *  aquí (eso es cosa de `comparison-result.schema.ts`, ya cubierto en otros tests), solo hace falta
 *  que sea válido para que el análisis llegue a `completed` y no a `error` por un lote rechazado. */
function fakeOpenRouterHttpResponse(): Response {
  const sixValidResults = Array.from({ length: 6 }, () => ({
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
  }));
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({ choices: [{ message: { content: JSON.stringify(sixValidResults) } }] }),
  } as unknown as Response;
}

async function buildApp(
  fakeSupabaseService: Pick<SupabaseService, 'getClient'>,
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useValue(fakeSupabaseService)
    // Punto central de este spec: `useClass`, no `useValue` — Nest construye una instancia real de
    // `OpenRouterProvider` (con su `PinoLogger` real inyectado) y la deja vinculada al token
    // `AI_PROVIDER`, tal y como haría `ai.module.ts` si se cambiara el `useExisting: GroqProvider`
    // por `useExisting: OpenRouterProvider`.
    .overrideProvider(AI_PROVIDER)
    .useClass(OpenRouterProvider)
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

describe('AI_PROVIDER vinculado a OpenRouterProvider (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;
  let fetchMock: jest.Mock;
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    db = new FakeDatabase();
    db.questionnaires.push({ user_id: 'user-1', answers: buildAnswers() });
    db.questionnaires.push({ user_id: 'user-2', answers: buildAnswers() });

    // Sin esta env var, `OpenRouterProvider.complete()` rechaza antes de llamar a `fetch`
    // (`openrouter.provider.spec.ts`, caso "sin OPENROUTER_API_KEY definida") — al no estar
    // definida `GROQ_API_KEY` tampoco en este entorno de test, si `AI_PROVIDER` siguiera apuntando
    // por error a `GroqProvider` el análisis fallaría igualmente por falta de API key, así que
    // llegar a `completed` exige que sea realmente `OpenRouterProvider` el vinculado.
    process.env.OPENROUTER_API_KEY = 'e2e-test-openrouter-key';

    // Mismo mock de `global.fetch` que `openrouter.provider.spec.ts` — es el único "cliente HTTP"
    // de `OpenRouterProvider`, así que sustituirlo es lo único necesario para no llamar a la red
    // real mientras se ejercita la clase real de principio a fin.
    fetchMock = jest.fn().mockResolvedValue(fakeOpenRouterHttpResponse());
    global.fetch = fetchMock;
  });

  afterEach(async () => {
    await app.close();
    global.fetch = originalFetch;
    process.env.OPENROUTER_API_KEY = originalApiKey;
  });

  it('despacha el análisis con la implementación real de OpenRouterProvider y la comparación llega a completed', async () => {
    db.comparisons.push({
      id: 'cmp-1',
      requester_user_id: 'user-1',
      candidate_user_id: 'user-2',
      status: 'error',
    });
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS));

    const response = await request(app.getHttpServer())
      .post('/comparisons/cmp-1/reanalyze')
      .set('Authorization', 'Bearer jwt-a')
      .expect(201);

    expect(response.body).toEqual({ status: 'analyzing' });

    await waitFor(() => db.comparisons.find((c) => c.id === 'cmp-1')?.status === 'completed');

    expect(db.questionResults).toHaveLength(36);
    expect(db.aggregatedResults).toHaveLength(1);

    // No basta con llegar a `completed`: se confirma que quien respondió fue de verdad
    // `OpenRouterProvider` (su URL y su cabecera `Authorization`, distintas de las de
    // `groq.provider.ts`), no un fake genérico que por casualidad cumple la interfaz `AiProvider`.
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer e2e-test-openrouter-key');
  });
});
