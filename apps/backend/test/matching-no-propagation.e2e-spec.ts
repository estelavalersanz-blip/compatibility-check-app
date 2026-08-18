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

interface FakeUserRow {
  id: string;
  questionnaire_completed_at: string | null;
}
interface FakeUserQualityRow {
  user_id: string;
  quality_id: string;
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
interface FakeComparisonRow {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  shared_qualities_count: number;
  status: string;
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

type Row = Record<string, unknown>;

/**
 * "Base de datos" en memoria con las seis tablas que toca el camino completo cuestionario ->
 * selección de candidatos -> análisis de IA. Ningún fake existente por separado cubre las seis a la
 * vez (`questionnaires.e2e-spec.ts` no tiene `user_qualities`/`comparisons`;
 * `matching-recalculate.e2e-spec.ts` no tiene `questionnaires` ni las tablas de resultados;
 * `comparisons-reanalyze.e2e-spec.ts` no tiene `users`/`user_qualities`) — de ahí que este test viva
 * en su propio archivo en vez de ampliar uno de los tres: necesita recorrer el flujo real de
 * principio a fin (HTTP -> evento -> selección -> evento -> IA), no un endpoint aislado.
 */
class FakeDatabase {
  users: FakeUserRow[] = [];
  userQualities: FakeUserQualityRow[] = [];
  questionnaires: FakeQuestionnaireRow[] = [];
  comparisons: FakeComparisonRow[] = [];
  questionResults: FakeQuestionResultRow[] = [];
  aggregatedResults: FakeAggregatedRow[] = [];
}

function usersTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeUserRow, value: unknown) => ({
        maybeSingle: () =>
          Promise.resolve({ data: db.users.find((u) => u[column] === value) ?? null, error: null }),
      }),
      // `candidate-selector.service.ts` excluye al propio solicitante con `.neq()` (nunca con
      // `.eq()`) para listar a todos los demás usuarios — único método de este fake que no requiere
      // `.maybeSingle()` porque siempre devuelve varias filas.
      neq: (column: keyof FakeUserRow, value: unknown) =>
        Promise.resolve({ data: db.users.filter((u) => u[column] !== value), error: null }),
    }),
    update: (patch: Row) => ({
      eq: (column: keyof FakeUserRow, value: unknown) => ({
        select: () => ({
          single: () => {
            const index = db.users.findIndex((u) => u[column] === value);
            if (index === -1) {
              return Promise.resolve({ data: null, error: { message: 'usuario no encontrado' } });
            }
            db.users[index] = { ...db.users[index], ...patch };
            return Promise.resolve({ data: { id: db.users[index].id }, error: null });
          },
        }),
      }),
    }),
  };
}

function userQualitiesTable(db: FakeDatabase) {
  return {
    select: () => ({
      eq: (column: keyof FakeUserQualityRow, value: unknown) =>
        Promise.resolve({ data: db.userQualities.filter((r) => r[column] === value), error: null }),
      in: (column: keyof FakeUserQualityRow, values: unknown[]) =>
        Promise.resolve({
          data: db.userQualities.filter((r) => values.includes(r[column])),
          error: null,
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
    // Solo hace falta `upsert` (envío inicial de C) — a diferencia de `questionnaires.e2e-spec.ts`,
    // aquí ningún camino ejercitado edita un cuestionario ya completo, así que no hace falta
    // `.update()`.
    upsert: (row: { user_id: string; answers: FakeAnswer[] }) => ({
      select: () => ({
        single: () => {
          const index = db.questionnaires.findIndex((q) => q.user_id === row.user_id);
          if (index === -1) {
            db.questionnaires.push({ user_id: row.user_id, answers: row.answers });
          } else {
            db.questionnaires[index] = { ...db.questionnaires[index], answers: row.answers };
          }
          return Promise.resolve({ data: { user_id: row.user_id }, error: null });
        },
      }),
    }),
  };
}

let nextComparisonId = 1;

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
    // Igual que `candidate-selector.service.spec.ts`: genera el `id` (en la base real lo asigna la
    // columna) y devuelve el array insertado tal cual — `CandidateSelectorService` nunca llama a
    // `.single()` aquí porque inserta hasta 3 filas de golpe en una sola llamada.
    insert: (rows: Row[]) => ({
      select: () => {
        const inserted = rows.map((row) => {
          const created: FakeComparisonRow = {
            id: `comparison-${nextComparisonId++}`,
            requester_user_id: row.requester_user_id as string,
            candidate_user_id: row.candidate_user_id as string,
            shared_qualities_count: row.shared_qualities_count as number,
            status: 'pending',
          };
          db.comparisons.push(created);
          return created;
        });
        return Promise.resolve({ data: inserted, error: null });
      },
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
          if (table === 'users') return usersTable(db);
          if (table === 'user_qualities') return userQualitiesTable(db);
          if (table === 'questionnaires') return questionnairesTable(db);
          if (table === 'comparisons') return comparisonsTable(db);
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

/**
 * A diferencia de `createAlwaysValidAiProvider` (`comparisons-reanalyze.e2e-spec.ts`), aquí
 * `complete` es un `jest.fn()`: este test necesita CONTAR cuántas veces se invoca al proveedor de
 * IA, no solo comprobar que la comparación termina en `completed`. Responde siempre con un lote
 * válido de 6 resultados, así que ninguna llamada agota reintentos y el conteo final es siempre
 * exacto (número de lotes reales), nunca inflado por reintentos — esa casuística ya la cubre
 * `ai-orchestrator.service.spec.ts` por separado.
 */
function createSpiedAiProvider(): { provider: AiProvider; complete: jest.Mock } {
  const complete = jest.fn().mockResolvedValue(
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
  );
  return { provider: { complete }, complete };
}

async function buildApp(
  fakeSupabaseService: Pick<SupabaseService, 'getClient'>,
  aiProvider: AiProvider,
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

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Tiempo de espera agotado esperando el efecto en segundo plano');
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const USER_C: FakeAuthUser = { id: 'auth-user-c', email: 'c@test.com' };
const AUTH_TOKENS = { 'jwt-c': USER_C };
const USER_B_ID = 'user-b';

// 36 preguntas / BATCH_SIZE=6 (`ai-orchestrator.service.ts`) = 6 lotes por comparación cuando
// ninguno falla y necesita reintento (aquí nunca ocurre: el proveedor fake siempre responde válido).
const BATCHES_PER_COMPARISON = 6;
const EXPECTED_CANDIDATES_FOR_C = 3;

/**
 * Cierra el hueco descrito en `candidate-matching` spec.md, Requirement "Cálculo único automático,
 * sin recálculo retroactivo para otros usuarios", escenario "Alta de un usuario nuevo no afecta a
 * comparaciones existentes": hasta ahora esa garantía se sostenía solo por aislamiento estructural
 * (`ComparisonsCreatedEvent` nunca lleva ids de comparaciones de otro usuario,
 * `questionnaire-completed.handler.ts`) — ningún test comprobaba con una aserción explícita que dar
 * de alta a un usuario nuevo no dispara NINGUNA llamada de IA adicional para usuarios ya existentes.
 *
 * Arranca `AppModule` completo (igual que `questionnaires.e2e-spec.ts` y
 * `matching-recalculate.e2e-spec.ts`) con `SupabaseService` Y `AI_PROVIDER` sustituidos por fakes en
 * memoria (igual que `comparisons-reanalyze.e2e-spec.ts`) — nunca red real, nunca Supabase local
 * (design.md, decisión 11): este es un test e2e con dobles, no un test de integración.
 */
describe('Alta de un usuario nuevo no propaga análisis a usuarios existentes (e2e)', () => {
  let app: INestApplication<App>;
  let db: FakeDatabase;

  beforeEach(() => {
    db = new FakeDatabase();

    // B: usuario YA existente que completó su cuestionario hace tiempo y ya tiene sus propios 3
    // candidatos calculados — se siembra directamente el estado final (nunca pasa por el endpoint
    // en este test), igual que la comparación "stale" de `matching-recalculate.e2e-spec.ts`. Los
    // `candidate_user_id` de estas filas no necesitan usuarios reales detrás: nada en este test
    // vuelve a analizarlas, solo se comprueba que sigan intactas.
    db.users.push({ id: USER_B_ID, questionnaire_completed_at: '2023-06-01T00:00:00.000Z' });
    db.comparisons.push(
      {
        id: 'existing-cmp-1',
        requester_user_id: USER_B_ID,
        candidate_user_id: 'user-x',
        shared_qualities_count: 3,
        status: 'completed',
      },
      {
        id: 'existing-cmp-2',
        requester_user_id: USER_B_ID,
        candidate_user_id: 'user-y',
        shared_qualities_count: 2,
        status: 'completed',
      },
      {
        id: 'existing-cmp-3',
        requester_user_id: USER_B_ID,
        candidate_user_id: 'user-z',
        shared_qualities_count: 1,
        status: 'completed',
      },
    );

    // C: el usuario nuevo del test, todavía sin cuestionario completado.
    db.users.push({ id: USER_C.id, questionnaire_completed_at: null });
    db.userQualities.push(
      { user_id: USER_C.id, quality_id: 'q1' },
      { user_id: USER_C.id, quality_id: 'q2' },
    );

    // D, E, F: pool de candidatos disponibles para C, con las mismas 2 cualidades que C — le ganan
    // a B en el ranking de `candidate-selector.service.ts` (`sharedQualitiesCount` 2 > 0) a
    // propósito: B no tiene ninguna cualidad registrada, así que nunca entra en el top 3 de C ni
    // puede recibir ninguna llamada de IA por su culpa. Necesitan cuestionario completo de verdad
    // (36 respuestas) porque `ai-orchestrator.service.ts` construye los pares pregunta a pregunta
    // de ambos lados de cada comparación nueva.
    for (const candidateId of ['user-d', 'user-e', 'user-f']) {
      db.users.push({ id: candidateId, questionnaire_completed_at: '2024-01-01T00:00:00.000Z' });
      db.userQualities.push(
        { user_id: candidateId, quality_id: 'q1' },
        { user_id: candidateId, quality_id: 'q2' },
      );
      db.questionnaires.push({ user_id: candidateId, answers: buildAnswers() });
    }
  });

  afterEach(async () => {
    await app.close();
  });

  it('completar el cuestionario de C no toca las comparaciones de B ni llama a la IA por B', async () => {
    const { provider: aiProvider, complete } = createSpiedAiProvider();
    app = await buildApp(createFakeSupabaseService(db, AUTH_TOKENS), aiProvider);

    // Instantánea de las filas de B antes de tocar nada — se compara por valor al final (no solo
    // por longitud), para detectar también una mutación en sitio, no solo un borrado/añadido.
    const bComparisonsBefore = db.comparisons
      .filter((c) => c.requester_user_id === USER_B_ID)
      .map((c) => ({ ...c }));

    await request(app.getHttpServer())
      .post('/users/me/questionnaire')
      .set('Authorization', 'Bearer jwt-c')
      .send(buildAnswers())
      .expect(201);

    // El envío del cuestionario responde 201 antes de que termine el análisis en segundo plano:
    // `CompleteQuestionnaireHandler.execute` llama a `eventBus.publish(...)` sin `await`
    // (`complete-questionnaire.handler.ts`), así que hay que esperar a que las comparaciones nuevas
    // de C lleguen a un estado terminal antes de poder contar las llamadas a la IA con seguridad.
    await waitFor(() => {
      const cComparisons = db.comparisons.filter((c) => c.requester_user_id === USER_C.id);
      return (
        cComparisons.length === EXPECTED_CANDIDATES_FOR_C &&
        cComparisons.every((c) => c.status === 'completed')
      );
    });

    // Confirma la premisa de la que depende el cálculo de abajo: C obtuvo exactamente a D, E y F
    // como candidatos (nunca a B, que se queda con 0 cualidades compartidas).
    const cComparisons = db.comparisons.filter((c) => c.requester_user_id === USER_C.id);
    expect(cComparisons.map((c) => c.candidate_user_id).sort()).toEqual([
      'user-d',
      'user-e',
      'user-f',
    ]);

    // (a) Exactamente las llamadas de C, ni una más: sus 3 candidatos × 6 lotes cada uno.
    expect(complete).toHaveBeenCalledTimes(EXPECTED_CANDIDATES_FOR_C * BATCHES_PER_COMPARISON);

    // (b) B sigue exactamente como estaba: mismo conteo, mismos ids, ninguna fila tocada ni de
    // refilón (el alta de C nunca consulta ni escribe filas donde B es `requester_user_id`).
    const bComparisonsAfter = db.comparisons.filter((c) => c.requester_user_id === USER_B_ID);
    expect(bComparisonsAfter).toEqual(bComparisonsBefore);
    expect(bComparisonsAfter.map((c) => c.id).sort()).toEqual([
      'existing-cmp-1',
      'existing-cmp-2',
      'existing-cmp-3',
    ]);
  });
});
