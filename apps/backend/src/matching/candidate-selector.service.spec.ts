import { PinoLogger } from 'nestjs-pino';
import { CandidateSelectorService } from './candidate-selector.service';
import { SupabaseService } from '../supabase/supabase.service';

interface FakeUser {
  id: string;
  questionnaire_completed_at: string | null;
}
interface FakeUserQuality {
  user_id: string;
  quality_id: string;
}
interface FakeComparison {
  id: string;
  requester_user_id: string;
  candidate_user_id: string;
  shared_qualities_count: number;
}

/** "Base de datos" en memoria — mismo patrón que los fakes de `*.e2e-spec.ts`, aquí para un test
 *  unitario porque no hace falta arrancar `AppModule`/HTTP para ejercitar un servicio normal. */
class FakeDb {
  users: FakeUser[] = [];
  userQualities: FakeUserQuality[] = [];
  comparisons: FakeComparison[] = [];
}

function buildService(db: FakeDb): {
  service: CandidateSelectorService;
  logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock };
} {
  let nextComparisonId = 1;

  const supabaseService = {
    getClient: () => ({
      from: (table: string) => {
        if (table === 'user_qualities') {
          return {
            select: () => ({
              eq: (column: keyof FakeUserQuality, value: string) =>
                Promise.resolve({
                  data: db.userQualities.filter((row) => row[column] === value),
                  error: null,
                }),
              in: (column: keyof FakeUserQuality, values: string[]) =>
                Promise.resolve({
                  data: db.userQualities.filter((row) => values.includes(row[column])),
                  error: null,
                }),
            }),
          };
        }
        if (table === 'users') {
          return {
            select: () => ({
              neq: (column: keyof FakeUser, value: string) =>
                Promise.resolve({
                  data: db.users.filter((row) => row[column] !== value),
                  error: null,
                }),
            }),
          };
        }
        if (table === 'comparisons') {
          return {
            insert: (rows: Array<Record<string, unknown>>) => ({
              select: () =>
                Promise.resolve({
                  data: rows.map((row) => {
                    const inserted: FakeComparison = {
                      id: `comparison-${nextComparisonId++}`,
                      requester_user_id: row.requester_user_id as string,
                      candidate_user_id: row.candidate_user_id as string,
                      shared_qualities_count: row.shared_qualities_count as number,
                    };
                    db.comparisons.push(inserted);
                    return inserted;
                  }),
                  error: null,
                }),
            }),
          };
        }
        throw new Error(`Tabla inesperada en el fake de test: ${table}`);
      },
    }),
  };

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), setContext: jest.fn() };

  return {
    service: new CandidateSelectorService(
      supabaseService as unknown as SupabaseService,
      logger as unknown as PinoLogger,
    ),
    logger,
  };
}

function candidate(
  id: string,
  qualityIds: string[],
  completedAt: string,
): { user: FakeUser; qualities: FakeUserQuality[] } {
  return {
    user: { id, questionnaire_completed_at: completedAt },
    qualities: qualityIds.map((qualityId) => ({ user_id: id, quality_id: qualityId })),
  };
}

function seed(
  db: FakeDb,
  requesterId: string,
  requesterQualityIds: string[],
  candidates: ReturnType<typeof candidate>[],
): void {
  db.userQualities.push(
    ...requesterQualityIds.map((qualityId) => ({ user_id: requesterId, quality_id: qualityId })),
  );
  for (const c of candidates) {
    db.users.push(c.user);
    db.userQualities.push(...c.qualities);
  }
}

const REQUESTER = 'requester-1';
const REQUESTER_QUALITIES = ['q1', 'q2', 'q3', 'q4', 'q5'];

describe('CandidateSelectorService', () => {
  it('con 3 o más candidatos disponibles, selecciona los 3 con más cualidades coincidentes', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, [
      candidate('candidate-a', ['q1', 'q2', 'q3', 'x', 'y'], '2024-01-01T00:00:00.000Z'), // 3
      candidate('candidate-b', ['q1', 'q2', 'x', 'y', 'z'], '2024-01-02T00:00:00.000Z'), // 2
      candidate('candidate-c', ['q1', 'x', 'y', 'z', 'w'], '2024-01-03T00:00:00.000Z'), // 1
      candidate('candidate-d', ['x', 'y', 'z', 'w', 'v'], '2024-01-04T00:00:00.000Z'), // 0
    ]);
    const { service, logger } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    expect(result.map((r) => [r.candidateUserId, r.sharedQualitiesCount])).toEqual([
      ['candidate-a', 3],
      ['candidate-b', 2],
      ['candidate-c', 1],
    ]);
    expect(db.comparisons).toHaveLength(3);
    expect(logger.info).toHaveBeenCalledTimes(1);
    const [fields] = logger.info.mock.calls[0] as [Record<string, unknown>];
    expect(fields).toMatchObject({ userId: REQUESTER });
  });

  it('desempata por antigüedad (cuestionario completado antes) cuando hay empate en cualidades', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, [
      candidate('candidate-a', ['q1', 'q2', 'x', 'y', 'z'], '2024-01-04T00:00:00.000Z'), // 2, más tarde
      candidate('candidate-b', ['q1', 'q2', 'x', 'y', 'z'], '2024-01-01T00:00:00.000Z'), // 2, más antiguo
      candidate('candidate-c', ['q1', 'q2', 'x', 'y', 'z'], '2024-01-03T00:00:00.000Z'), // 2
      candidate('candidate-d', ['q1', 'q2', 'x', 'y', 'z'], '2024-01-02T00:00:00.000Z'), // 2
    ]);
    const { service } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    // Los 4 empatan a 2 cualidades — solo caben 3, gana antigüedad: b (01) < d (02) < c (03), a (04) fuera.
    expect(result.map((r) => r.candidateUserId)).toEqual([
      'candidate-b',
      'candidate-d',
      'candidate-c',
    ]);
  });

  it('con exactamente 1 candidato disponible, crea una única comparación', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, [
      candidate('candidate-a', ['q1'], '2024-01-01T00:00:00.000Z'),
    ]);
    const { service } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    expect(result).toHaveLength(1);
    expect(result[0].candidateUserId).toBe('candidate-a');
  });

  it('con exactamente 2 candidatos disponibles, crea dos comparaciones', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, [
      candidate('candidate-a', ['q1'], '2024-01-01T00:00:00.000Z'),
      candidate('candidate-b', ['q1', 'q2'], '2024-01-02T00:00:00.000Z'),
    ]);
    const { service } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    expect(result).toHaveLength(2);
  });

  it('sin ningún candidato disponible, no crea ninguna comparación y no falla', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, []);
    const { service, logger } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    expect(result).toEqual([]);
    expect(db.comparisons).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('un usuario con cuestionario sin completar (questionnaire_completed_at null) nunca es candidato', async () => {
    const db = new FakeDb();
    seed(db, REQUESTER, REQUESTER_QUALITIES, []);
    db.users.push({ id: 'draft-only-user', questionnaire_completed_at: null });
    db.userQualities.push({ user_id: 'draft-only-user', quality_id: 'q1' });
    const { service } = buildService(db);

    const result = await service.selectCandidates(REQUESTER);

    expect(result).toEqual([]);
  });

  it('tarea 8.3: no genera ni modifica comparaciones de otros usuarios ya existentes', async () => {
    const db = new FakeDb();
    db.comparisons.push({
      id: 'existing-comparison',
      requester_user_id: 'other-requester',
      candidate_user_id: 'other-candidate',
      shared_qualities_count: 4,
    });
    const existingSnapshot = { ...db.comparisons[0] };
    seed(db, REQUESTER, REQUESTER_QUALITIES, [
      candidate('candidate-a', ['q1', 'q2'], '2024-01-01T00:00:00.000Z'),
    ]);
    const { service } = buildService(db);

    await service.selectCandidates(REQUESTER);

    const untouched = db.comparisons.find((c) => c.id === 'existing-comparison');
    expect(untouched).toEqual(existingSnapshot);
    expect(
      db.comparisons.every(
        (c) => c.id === 'existing-comparison' || c.requester_user_id === REQUESTER,
      ),
    ).toBe(true);
  });
});
