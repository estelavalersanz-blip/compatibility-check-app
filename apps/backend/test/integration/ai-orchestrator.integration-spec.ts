import { PinoLogger } from 'nestjs-pino';
import { AiOrchestratorService } from '../../src/ai/ai-orchestrator.service';
import { AiProvider } from '../../src/ai/ai-provider.interface';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { createComparison } from '../factories/create-comparison';
import { createTestQuestionnaire } from '../factories/create-test-questionnaire';
import { createTestUser } from '../factories/create-test-user';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

/**
 * Sección 9, riesgo señalado explícitamente al cerrarla — mismo patrón que la tarea 7.9: el insert
 * en bloque de 36 filas de `comparison_question_results` (`.insert([...]).select('id')`, sin
 * `.single()`, nuevo en `writable-table.ts`) y los `.delete()` nuevos sobre esa tabla y
 * `comparison_aggregated_results` solo se habían probado contra fakes en memoria, nunca contra
 * PostgREST/Postgres real. Aquí se ejercita la clase real (`AiOrchestratorService`) con una
 * `SupabaseService` real apuntando al stack local — solo el `AiProvider` se sustituye por un fake
 * controlable (el riesgo es la escritura en BD, no la llamada al LLM real, que no se ejercita en
 * ningún test de este proyecto — ver design.md, decisión 11).
 */

function buildAnswers(): Array<{ questionId: number; question: string; answer: string }> {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

function validBatchResponseJson(): string {
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

function buildAlwaysValidAiProvider(): AiProvider {
  return { complete: () => Promise.resolve(validBatchResponseJson()) };
}

function buildAlwaysInvalidAiProvider(): AiProvider {
  return { complete: () => Promise.resolve('esto no es JSON válido en absoluto') };
}

function buildSilentLogger(): PinoLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    setContext: () => undefined,
  } as unknown as PinoLogger;
}

interface StaleFlaggedRow {
  result: { stale?: boolean };
}

/** Mismo patrón que `asUserRow` (`user-profile.mapper.ts`): el `as` vive en un `return`, nunca en
 *  una asignación local, para que `eslint --fix` no lo detecte como "innecesario" y lo elimine
 *  (ya pasó una vez al escribir este mismo archivo). */
function asStaleFlaggedRows(rows: unknown): StaleFlaggedRow[] {
  return (rows as StaleFlaggedRow[] | null) ?? [];
}

describe('AiOrchestratorService — escritura en bloque contra el stack local real (sección 9)', () => {
  const admin = createSupabaseAdminTestClient();
  let requesterId: string;
  let candidateId: string;
  let comparisonId: string;

  beforeEach(async () => {
    const [requesterAccount, candidateAccount] = getTestAccountPool();

    const requesterProfile = await createTestUser(admin, { authUserId: requesterAccount.id });
    const candidateProfile = await createTestUser(admin, { authUserId: candidateAccount.id });
    requesterId = requesterProfile.id;
    candidateId = candidateProfile.id;

    await createTestQuestionnaire(admin, { userId: requesterId, answers: buildAnswers() });
    await createTestQuestionnaire(admin, { userId: candidateId, answers: buildAnswers() });

    const comparison = await createComparison(admin, {
      requesterUserId: requesterId,
      candidateUserId: candidateId,
      status: 'pending',
    });
    comparisonId = comparison.id;
  });

  it('con un proveedor de IA que siempre valida, inserta las 6 filas muestreadas + el agregado y marca completed', async () => {
    const supabaseService = new SupabaseService();
    const orchestrator = new AiOrchestratorService(
      buildAlwaysValidAiProvider(),
      supabaseService,
      buildSilentLogger(),
    );

    await orchestrator.analyzeComparison(comparisonId);

    const { data: comparisonRow } = await admin
      .from('comparisons')
      .select('status')
      .eq('id', comparisonId)
      .single();
    expect((comparisonRow as { status: string }).status).toBe('completed');

    const { data: questionResults } = await admin
      .from('comparison_question_results')
      .select('id, question_id')
      .eq('comparison_id', comparisonId);
    // 6 preguntas muestreadas (1 por bloque, `selectSampledQuestionIds`), no las 36 completas.
    expect(questionResults).toHaveLength(6);

    const { data: aggregatedResults } = await admin
      .from('comparison_aggregated_results')
      .select('id')
      .eq('comparison_id', comparisonId);
    expect(aggregatedResults).toHaveLength(1);
  });

  it('reanalizar borra de verdad los resultados/agregado anteriores en vez de acumularlos', async () => {
    // Restos de un "análisis anterior" insertados directamente contra BD real.
    await admin
      .from('comparison_question_results')
      .insert({ comparison_id: comparisonId, question_id: 1, result: { stale: true } });
    await admin
      .from('comparison_aggregated_results')
      .insert({ comparison_id: comparisonId, result: { stale: true } });

    const supabaseService = new SupabaseService();
    const orchestrator = new AiOrchestratorService(
      buildAlwaysValidAiProvider(),
      supabaseService,
      buildSilentLogger(),
    );

    await orchestrator.analyzeComparison(comparisonId);

    const { data: questionResults } = await admin
      .from('comparison_question_results')
      .select('result')
      .eq('comparison_id', comparisonId);
    const rows = asStaleFlaggedRows(questionResults);
    expect(rows).toHaveLength(6); // ni 7 (acumulado sobre el stale) ni menos
    expect(rows.every((row) => !row.result.stale)).toBe(true);

    const { data: aggregatedResults } = await admin
      .from('comparison_aggregated_results')
      .select('result')
      .eq('comparison_id', comparisonId);
    const aggregatedRows = asStaleFlaggedRows(aggregatedResults);
    expect(aggregatedRows).toHaveLength(1); // UNIQUE(comparison_id) — el viejo tuvo que borrarse antes
    expect(aggregatedRows[0]?.result.stale).toBeFalsy();
  });

  it('si el proveedor de IA nunca valida, marca error y no deja ninguna fila nueva en BD real', async () => {
    const supabaseService = new SupabaseService();
    const orchestrator = new AiOrchestratorService(
      buildAlwaysInvalidAiProvider(),
      supabaseService,
      buildSilentLogger(),
    );

    await orchestrator.analyzeComparison(comparisonId);

    const { data: comparisonRow } = await admin
      .from('comparisons')
      .select('status')
      .eq('id', comparisonId)
      .single();
    expect((comparisonRow as { status: string }).status).toBe('error');

    const { data: questionResults } = await admin
      .from('comparison_question_results')
      .select('id')
      .eq('comparison_id', comparisonId);
    expect(questionResults).toHaveLength(0);

    const { data: aggregatedResults } = await admin
      .from('comparison_aggregated_results')
      .select('id')
      .eq('comparison_id', comparisonId);
    expect(aggregatedResults).toHaveLength(0);
  });
});
