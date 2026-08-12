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
});
