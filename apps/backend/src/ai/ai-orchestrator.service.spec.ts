import { PinoLogger } from 'nestjs-pino';
import { AiOrchestratorService } from './ai-orchestrator.service';
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

function buildValidBatchResponse(): string {
  return JSON.stringify(
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
  );
}

/** Un marcador único por bloque, insertado como texto de la primera pregunta del bloque — permite
 *  identificar a qué lote pertenece una llamada al proveedor de IA por el CONTENIDO del prompt
 *  (estable entre reintentos, a diferencia del número de orden de la llamada bajo concurrencia). */
const BLOCK_MARKERS = ['MARK_0', 'MARK_1', 'MARK_2', 'MARK_3', 'MARK_4', 'MARK_5'];

function buildAnswers(): FakeAnswer[] {
  return Array.from({ length: 36 }, (_, i) => {
    const questionId = i + 1;
    const isFirstOfBlock = i % 6 === 0;
    return {
      questionId,
      question: isFirstOfBlock ? BLOCK_MARKERS[Math.floor(i / 6)] : `Pregunta ${questionId}`,
      answer: `Respuesta ${questionId}`,
    };
  });
}

/** Texto reconocible usado como respuesta real de los usuarios en el test de no-fuga de logging —
 *  si este texto apareciera en cualquier llamada al logger del orquestador, demostraría que se está
 *  registrando el CONTENIDO de las respuestas y no solo metadatos técnicos. */
const USER_ANSWER_MARKER = 'RESPUESTA_DE_PRUEBA_XYZ';

/** Igual que buildAnswers(), pero sustituye el texto de cada respuesta por el marcador de arriba.
 *  Mantiene los BLOCK_MARKERS en la pregunta (los necesita el mock de `complete` para identificar a
 *  qué lote pertenece cada llamada) y así aísla la única variable que el test quiere comprobar: el
 *  contenido de la RESPUESTA, que sí viaja dentro de `buildUserPrompt`/`buildCorrectionPrompt` (ver
 *  `prompts/compatibility-prompt.ts`) pero nunca debería viajar a un log. */
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

describe('AiOrchestratorService', () => {
  it('agrupa las 36 preguntas en 6 lotes de 6, valida cada respuesta y marca la comparación completed', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    const complete = jest.fn().mockResolvedValue(buildValidBatchResponse());
    const logger = buildLogger();
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      logger as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(complete).toHaveBeenCalledTimes(6);
    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('completed');
    expect(db.questionResults).toHaveLength(36);
    expect(db.aggregatedResults).toHaveLength(1);

    // Cada llamada corresponde a un bloque de 6 questionIds consecutivos: 1-6, 7-12, ..., 31-36.
    const loggedQuestionIdGroups = logger.info.mock.calls
      .map(([fields]) => fields as { questionIds?: number[] })
      .filter((fields) => Array.isArray(fields.questionIds))
      .map((fields) => fields.questionIds as number[]);
    const uniqueGroups = Array.from(new Set(loggedQuestionIdGroups.map((g) => g.join(','))));
    expect(uniqueGroups.sort()).toEqual(
      [
        '1,2,3,4,5,6',
        '13,14,15,16,17,18',
        '19,20,21,22,23,24',
        '25,26,27,28,29,30',
        '31,32,33,34,35,36',
        '7,8,9,10,11,12',
      ].sort(),
    );
  });

  it('reintenta un lote inválido hasta el éxito, con el mismo resultado final que si hubiera sido válido a la primera', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    const attemptsByBlock = new Map<string, number>();
    const complete = jest.fn().mockImplementation((request: { userPrompt: string }) => {
      const marker = BLOCK_MARKERS.find((m) => request.userPrompt.includes(m));
      const attempt = (attemptsByBlock.get(marker as string) ?? 0) + 1;
      attemptsByBlock.set(marker as string, attempt);
      return Promise.resolve(attempt === 1 ? 'esto no es JSON válido' : buildValidBatchResponse());
    });
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      buildLogger() as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(complete).toHaveBeenCalledTimes(12); // 6 lotes × 2 intentos cada uno
    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('completed');
    expect(db.questionResults).toHaveLength(36);
  });

  it('marca la comparación como error tras 3 intentos fallidos de un lote, sin persistir nada nuevo', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    const complete = jest
      .fn()
      .mockImplementation((request: { userPrompt: string }) =>
        Promise.resolve(
          request.userPrompt.includes('MARK_0') ? 'siempre inválido' : buildValidBatchResponse(),
        ),
      );
    const logger = buildLogger();
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      logger as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(db.comparisons.find((c) => c.id === 'cmp-1')?.status).toBe('error');
    expect(db.questionResults).toHaveLength(0);
    expect(db.aggregatedResults).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it('respeta el límite de 2 lotes concurrentes por comparación', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    let active = 0;
    let maxActive = 0;
    const complete = jest.fn().mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active--;
      return buildValidBatchResponse();
    });
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      buildLogger() as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(maxActive).toBeGreaterThan(1);
  });

  it('borra los resultados y el agregado anteriores antes de reanalizar (repetir desde cero)', async () => {
    const db = new FakeDb();
    seedComparisonWithBothUsers(db);
    db.questionResults.push({ comparison_id: 'cmp-1', question_id: 1, result: { stale: true } });
    db.aggregatedResults.push({ comparison_id: 'cmp-1', result: { stale: true } });
    const complete = jest.fn().mockResolvedValue(buildValidBatchResponse());
    const service = new AiOrchestratorService(
      { complete },
      buildSupabaseService(db),
      buildLogger() as unknown as PinoLogger,
    );

    await service.analyzeComparison('cmp-1');

    expect(db.questionResults).toHaveLength(36);
    expect(
      db.questionResults.every(
        (r) => r.result !== null && !(r.result as { stale?: boolean }).stale,
      ),
    ).toBe(true);
    expect(db.aggregatedResults).toHaveLength(1);
  });

  describe('logging estructurado del flujo de análisis (spec ai-compatibility-analysis)', () => {
    it('propaga el mismo comparisonId en los logs de envío y recepción de cada lote (caso feliz, 6 lotes)', async () => {
      const db = new FakeDb();
      seedComparisonWithBothUsers(db);
      const complete = jest.fn().mockResolvedValue(buildValidBatchResponse());
      const logger = buildLogger();
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        logger as unknown as PinoLogger,
      );
      const comparisonId = 'cmp-1';

      await service.analyzeComparison(comparisonId);

      // Caso feliz: de los 4 puntos de log por lote (envío, recepción válida, warn en reintento,
      // error tras agotar intentos) solo se disparan los 2 primeros, uno por cada uno de los 6
      // lotes -- ningún lote falla ni se reintenta aquí.
      const sendAndReceiveMessages = ['Enviando lote al proveedor de IA', 'Lote válido recibido'];
      const batchLogCalls = logger.info.mock.calls.filter(([, message]) =>
        sendAndReceiveMessages.includes(message as string),
      );
      expect(batchLogCalls).toHaveLength(12); // 6 lotes × (envío + recepción válida)
      batchLogCalls.forEach(([fields]) => {
        expect((fields as { comparisonId?: string }).comparisonId).toBe(comparisonId);
      });

      // Sin fallos en el camino feliz no debería haberse registrado ningún warn/error de lote.
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('nunca registra el texto real de las respuestas de los usuarios, solo metadatos técnicos', async () => {
      const db = new FakeDb();
      db.comparisons.push({
        id: 'cmp-1',
        requester_user_id: 'user-1',
        candidate_user_id: 'user-2',
        status: 'pending',
      });
      db.questionnaires.push({ user_id: 'user-1', answers: buildAnswersWithMarkerText() });
      db.questionnaires.push({ user_id: 'user-2', answers: buildAnswersWithMarkerText() });
      // Mismo escenario que "marca la comparación como error tras 3 intentos fallidos": el bloque
      // MARK_0 nunca es válido y el resto sí -- así se ejercitan los 4 puntos de log de un lote
      // (envío, recepción válida, warn en reintento y error tras agotar intentos), no solo el
      // camino feliz, que es donde de verdad importa que no haya fuga de datos de usuario.
      const complete = jest
        .fn()
        .mockImplementation((request: { userPrompt: string }) =>
          Promise.resolve(
            request.userPrompt.includes('MARK_0') ? 'siempre inválido' : buildValidBatchResponse(),
          ),
        );
      const logger = buildLogger();
      const service = new AiOrchestratorService(
        { complete },
        buildSupabaseService(db),
        logger as unknown as PinoLogger,
      );

      await service.analyzeComparison('cmp-1');

      // Confirma que el escenario ejercitó de verdad los 4 puntos de log -- si alguno no se
      // disparase, la comprobación de no-fuga de abajo estaría comprobando de menos sin avisar.
      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();

      // El contenido real de las respuestas (lo que compone buildUserPrompt/buildCorrectionPrompt)
      // no debe llegar nunca a un log del orquestador -- solo metadatos (comparisonId, questionIds,
      // attempt, reason técnico del fallo de parseo/validación).
      const allLoggerCalls: unknown[][] = [
        ...(logger.info.mock.calls as unknown[][]),
        ...(logger.warn.mock.calls as unknown[][]),
        ...(logger.error.mock.calls as unknown[][]),
      ];
      const leaked = allLoggerCalls.some((call) =>
        JSON.stringify(call).includes(USER_ANSWER_MARKER),
      );
      expect(leaked).toBe(false);
    });
  });
});
