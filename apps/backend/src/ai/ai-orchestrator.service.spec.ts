import { PinoLogger } from 'nestjs-pino';
import { blockIndexOf } from '../comparisons/weighting.util';
import {
  AiOrchestratorService,
  PRODUCTION_RETRY_BACKOFF_MS,
  runWithConcurrencyLimit,
  selectSampledQuestionIds,
} from './ai-orchestrator.service';
import { SupabaseService } from '../supabase/supabase.service';

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

class FakeDb {
  comparisons: FakeComparisonRow[] = [];
  questionnaires: FakeQuestionnaireRow[] = [];
  questionResults: FakeQuestionResultRow[] = [];
  aggregatedResults: FakeAggregatedRow[] = [];
}

function comparisonsTable(db: FakeDb) {
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

function questionnairesTable(db: FakeDb) {
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

function questionResultsTable(db: FakeDb) {
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

function aggregatedResultsTable(db: FakeDb) {
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

function buildSupabaseService(db: FakeDb): SupabaseService {
  const fake = {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'comparisons') return comparisonsTable(db);
        if (table === 'questionnaires') return questionnairesTable(db);
        if (table === 'comparison_question_results') return questionResultsTable(db);
        if (table === 'comparison_aggregated_results') return aggregatedResultsTable(db);
        throw new Error(`Tabla inesperada en el fake de test: ${table}`);
      },
    }),
  };
  return fake as unknown as SupabaseService;
}

function buildLogger(): {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  setContext: jest.Mock;
} {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), setContext: jest.fn() };
}

/** El mock de `complete()` no sabe (ni necesita saber) cuántas preguntas le llegaron — siempre
 *  devuelve tantos elementos como `questionIds.length`, igual que haría un LLM real respetando la
 *  instrucción "un objeto por cada pregunta recibida". Con la selección de 6 preguntas muestreadas
 *  (`selectSampledQuestionIds`), esto son siempre 6 — pero no se asume ese número aquí a fuego para
 *  no acoplar el mock a un detalle de la implementación actual. */
function buildValidBatchResponse(questionIds: number[]): string {
  return JSON.stringify(
    questionIds.map(() => ({
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
  );
}

/** Extrae los `questionId` mencionados en el prompt de usuario real (`buildUserPrompt`,
 *  `compatibility-prompt.ts`: `Pregunta N` por cada línea) — permite que el mock de `complete()`
 *  responda con el número correcto de resultados sin depender de cuántas preguntas se muestrearon
 *  en cada llamada concreta (aleatorio, ver `selectSampledQuestionIds`). */
function questionIdsFromPrompt(userPrompt: string): number[] {
  const matches = userPrompt.matchAll(/Pregunta (\d+)"/g);
  return Array.from(matches, (match) => Number(match[1]));
}

function buildAnswers(): FakeAnswer[] {
  return Array.from({ length: 36 }, (_, i) => {
    const questionId = i + 1;
    return { questionId, question: `Pregunta ${questionId}`, answer: `Respuesta ${questionId}` };
  });
}

/** Texto reconocible usado como respuesta real de los usuarios en los tests de no-fuga de logging —
 *  si este texto apareciera en cualquier llamada al logger del orquestador, demostraría que se está
 *  registrando el CONTENIDO de las respuestas y no solo metadatos técnicos. */
const USER_ANSWER_MARKER = 'RESPUESTA_DE_PRUEBA_XYZ';

/** Igual que buildAnswers(), pero sustituye el texto de cada respuesta por el marcador de arriba. */
function buildAnswersWithMarkerText(): FakeAnswer[] {
  return buildAnswers().map((answer) => ({ ...answer, answer: USER_ANSWER_MARKER }));
}

function seedComparisonWithBothUsers(db: FakeDb): void {
  db.comparisons.push({
    id: 'cmp-1',
    requester_user_id: 'user-1',
    candidate_user_id: 'user-2',
    status: 'pending',
  });
  db.questionnaires.push({ user_id: 'user-1', answers: buildAnswers() });
  db.questionnaires.push({ user_id: 'user-2', answers: buildAnswers() });
}

describe('selectSampledQuestionIds', () => {
  it('devuelve exactamente 6 ids, uno de cada uno de los 6 bloques', () => {
    const ids = selectSampledQuestionIds();

    expect(ids).toHaveLength(6);
    const blocksRepresented = new Set(ids.map(blockIndexOf));
    expect(blocksRepresented.size).toBe(6);
  });

  it('usa randomFn para decidir qué pregunta de cada bloque, no siempre la misma', () => {
    // randomFn devuelve siempre 0 -> siempre la primera pregunta de cada bloque (1, 7, 13...).
    const firstOfEachBlock = selectSampledQuestionIds(() => 0);
    expect(firstOfEachBlock).toEqual([1, 7, 13, 19, 25, 31]);

    // randomFn devuelve siempre un valor que resuelve al último índice del bloque (5/6) -> siempre
    // la última pregunta de cada bloque (6, 12, 18...).
    const lastOfEachBlock = selectSampledQuestionIds(() => 5 / 6);
    expect(lastOfEachBlock).toEqual([6, 12, 18, 24, 30, 36]);
  });

  it('en muchas ejecuciones reales (randomFn por defecto), aparece más de una pregunta distinta por bloque', () => {
    // Comprobación estadística, no determinista: con Math.random() de verdad, en 30 ejecuciones es
    // prácticamente seguro que al menos un bloque muestre más de un id distinto entre ellas — si
    // esto fallara de forma reproducible, indicaría que randomFn no se está usando de verdad.
    const runs = Array.from({ length: 30 }, () => selectSampledQuestionIds());
    const distinctIdsInBlock0 = new Set(runs.map((ids) => ids[0]));
    expect(distinctIdsInBlock0.size).toBeGreaterThan(1);
  });
});

describe('runWithConcurrencyLimit', () => {
  it('nunca ejecuta más de `limit` tareas a la vez, y las completa todas', async () => {
    let active = 0;
    let maxActive = 0;
    const results = await runWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (item) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active--;
      return item * 10;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(maxActive).toBeGreaterThan(1);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });
});

describe('AiOrchestratorService', () => {
  it('selecciona 6 preguntas (1 al azar de cada uno de los 6 bloques), valida la respuesta y marca la comparación completed', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    const complete = jest
      .fn()
      .mockImplementation((request: { userPrompt: string }) =>
        Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt))),
      );
    const logger = buildLogger();
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      logger as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    // Una sola llamada al proveedor de IA (un único lote con las 6 preguntas muestreadas) — no 6
    // como cuando se enviaban las 36 completas.
    expect(complete).toHaveBeenCalledTimes(1);
    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('completed');
    expect(db.questionResults).toHaveLength(6);
    expect(db.aggregatedResults).toHaveLength(1);

    // Las 6 preguntas analizadas y persistidas cubren los 6 bloques, una cada uno — nunca 2 del
    // mismo bloque ni ninguno sin representar.
    const analyzedQuestionIds = db.questionResults.map((r) => r.question_id);
    expect(new Set(analyzedQuestionIds.map(blockIndexOf)).size).toBe(6);
  });

  it('reintenta el lote muestreado hasta el éxito, con el mismo resultado final que si hubiera sido válido a la primera', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    let attempt = 0;
    const complete = jest.fn().mockImplementation((request: { userPrompt: string }) => {
      attempt++;
      if (attempt === 1) {
        return Promise.resolve('esto no es JSON válido');
      }
      return Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt)));
    });
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      buildLogger() as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(complete).toHaveBeenCalledTimes(2);
    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('completed');
    expect(db.questionResults).toHaveLength(6);
  });

  it('marca la comparación como error tras 3 intentos fallidos del lote muestreado, sin persistir nada nuevo', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    const complete = jest.fn().mockResolvedValue('siempre inválido');
    const logger = buildLogger();
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      logger as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(complete).toHaveBeenCalledTimes(3);
    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('error');
    expect(db.questionResults).toHaveLength(0);
    expect(db.aggregatedResults).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  describe('backoff entre reintentos (bug real de producción, 2026-08-19)', () => {
    /**
     * Con solo 50/150ms de espera (valor histórico), los 3 reintentos se agotaban casi al instante
     * contra el límite de Groq de 8.000 tokens/minuto — Groq pide esperar 20-30s reales tras un
     * 429, así que ningún reintento tenía margen real antes de volver a fallar. Este test NO
     * comprueba el valor numérico en sí contra temporizadores reales (eso haría la suite lenta sin
     * aportar nada) — solo que el 4º parámetro del constructor (inyectado vía `AI_RETRY_BACKOFF_MS`
     * en la app real, `ai.module.ts`) es el que de verdad se usa entre intentos, no un valor fijo
     * ignorado.
     */
    it('usa el backoff pasado por parámetro entre reintentos del lote muestreado, no un valor fijo interno', async () => {
      const db = new FakeDb();
      seedComparisonWithBothUsers(db);
      let attempt = 0;
      const complete = jest.fn().mockImplementation((request: { userPrompt: string }) => {
        attempt++;
        // Solo falla la primera vez -> el único backoff que se llega a esperar de verdad es
        // retryBackoffMs[0], nunca retryBackoffMs[1].
        if (attempt === 1) {
          return Promise.resolve('inválido');
        }
        return Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt)));
      });
      const customBackoffMs = [200, 60_000]; // el 2º valor no debería llegar a usarse aquí
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        buildLogger() as unknown as PinoLogger,
        customBackoffMs,
      );

      const startedAt = Date.now();
      await service.analyzeComparison('cmp-1');
      const elapsedMs = Date.now() - startedAt;

      // >= el backoff inyectado (con margen por la ejecución real) y muy por debajo del segundo
      // valor (60s): si el código ignorase el parámetro y usara siempre el 2º índice, o un valor
      // fijo distinto, este rango lo detectaría.
      expect(elapsedMs).toBeGreaterThanOrEqual(180);
      expect(elapsedMs).toBeLessThan(10_000);
    });

    it('PRODUCTION_RETRY_BACKOFF_MS (el valor real que usa ai.module.ts) da margen a los 20-30s que Groq pide tras un 429, no los 50/150ms de los tests', () => {
      expect(PRODUCTION_RETRY_BACKOFF_MS).toEqual([10_000, 25_000]);
    });
  });

  it('borra los resultados y el agregado anteriores antes de reanalizar (repetir desde cero)', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    db.questionResults.push({ comparison_id: 'cmp-1', question_id: 1, result: { stale: true } });
    db.aggregatedResults.push({ comparison_id: 'cmp-1', result: { stale: true } });
    const complete = jest
      .fn()
      .mockImplementation((request: { userPrompt: string }) =>
        Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt))),
      );
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      buildLogger() as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(db.questionResults).toHaveLength(6);
    expect(
      db.questionResults.every(
        (r) => r.result !== null && !(r.result as { stale?: boolean }).stale,
      ),
    ).toBe(true);
    expect(db.aggregatedResults).toHaveLength(1);
  });

  describe('logging estructurado del flujo de análisis (spec ai-compatibility-analysis)', () => {
    it('propaga el mismo comparisonId en los logs de envío y recepción del lote muestreado (caso feliz)', async () => {
      const db = new FakeDb();
      seedComparisonWithBothUsers(db);
      const complete = jest
        .fn()
        .mockImplementation((request: { userPrompt: string }) =>
          Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt))),
        );
      const logger = buildLogger();
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        logger as unknown as PinoLogger,
      );
      const comparisonId = 'cmp-1';

      await service.analyzeComparison(comparisonId);

      // Caso feliz: de los 4 puntos de log por lote (envío, recepción válida, warn en reintento,
      // error tras agotar intentos) solo se disparan los 2 primeros — un único lote, sin fallos.
      const sendAndReceiveMessages = ['Enviando lote al proveedor de IA', 'Lote válido recibido'];
      const batchLogCalls = logger.info.mock.calls.filter(([, message]) =>
        sendAndReceiveMessages.includes(message as string),
      );
      expect(batchLogCalls).toHaveLength(2); // 1 lote × (envío + recepción válida)
      batchLogCalls.forEach(([fields]) => {
        expect((fields as { comparisonId?: string }).comparisonId).toBe(comparisonId);
      });

      // Sin fallos en el camino feliz no debería haberse registrado ningún warn/error de lote.
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    /** Comprueba los 2 escenarios posibles ahora que solo hay un lote combinado (antes, con 6
     *  lotes independientes, un único escenario con un bloque siempre inválido bastaba para
     *  ejercitar los 4 puntos de log a la vez — envío, recepción válida, warn y error — porque el
     *  resto de bloques sí llegaban a "recepción válida". Con un solo lote, o se acaba agotando los
     *  intentos (envío + warn + error, nunca "recepción válida") o se recupera antes (envío +
     *  warn + recepción válida, nunca "error tras agotar"): hacen falta los 2 escenarios para
     *  cubrir los 4 puntos de log entre ambos. */
    function buildComparisonWithMarkedAnswers(db: FakeDb): void {
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: 'user-1',
        candidate_user_id: 'user-2',
        status: 'pending',
      });
      db.questionnaires.push({ user_id: 'user-1', answers: buildAnswersWithMarkerText() });
      db.questionnaires.push({ user_id: 'user-2', answers: buildAnswersWithMarkerText() });
    }

    function expectNoLeakedAnswerText(logger: ReturnType<typeof buildLogger>): void {
      const allLoggerCalls: unknown[][] = [
        ...(logger.info.mock.calls as unknown[][]),
        ...(logger.warn.mock.calls as unknown[][]),
        ...(logger.error.mock.calls as unknown[][]),
      ];
      const leaked = allLoggerCalls.some((call) =>
        JSON.stringify(call).includes(USER_ANSWER_MARKER),
      );
      expect(leaked).toBe(false);
    }

    it('nunca registra el texto real de las respuestas de los usuarios cuando el lote se recupera tras un reintento', async () => {
      const db = new FakeDb();
      buildComparisonWithMarkedAnswers(db);
      let attempt = 0;
      const complete = jest.fn().mockImplementation((request: { userPrompt: string }) => {
        attempt++;
        if (attempt === 1) {
          return Promise.resolve('siempre inválido la primera vez');
        }
        return Promise.resolve(buildValidBatchResponse(questionIdsFromPrompt(request.userPrompt)));
      });
      const logger = buildLogger();
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        logger as unknown as PinoLogger,
      );

      await service.analyzeComparison('cmp-1');

      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expectNoLeakedAnswerText(logger);
    });

    it('nunca registra el texto real de las respuestas de los usuarios cuando se agotan los intentos', async () => {
      const db = new FakeDb();
      buildComparisonWithMarkedAnswers(db);
      const complete = jest.fn().mockResolvedValue('siempre inválido');
      const logger = buildLogger();
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        logger as unknown as PinoLogger,
      );

      await service.analyzeComparison('cmp-1');

      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expectNoLeakedAnswerText(logger);
    });
  });
});
