import { EventBus } from '@nestjs/cqrs';
import { CompleteQuestionnaireCommand } from '../../src/questionnaires/commands/complete-questionnaire.command';
import { CompleteQuestionnaireHandler } from '../../src/questionnaires/commands/complete-questionnaire.handler';
import { QuestionnairesService } from '../../src/questionnaires/questionnaires.service';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { createTestQuestionnaire } from '../factories/create-test-questionnaire';
import { createTestUser } from '../factories/create-test-user';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

function buildAnswers(
  count: number,
): Array<{ questionId: number; question: string; answer: string }> {
  return Array.from({ length: count }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

/**
 * Sección 7, tarea 7.9 — riesgo señalado explícitamente al cerrar la sección: `writableTable(...)
 * .upsert(..., {onConflict:'user_id'})`, nuevo en esta sección, solo se había probado contra los
 * fakes en memoria de `questionnaires.e2e-spec.ts`/`complete-questionnaire.handler.spec.ts`, nunca
 * contra PostgREST/Postgres real. Aquí se ejercitan las clases reales (`QuestionnairesService`,
 * `CompleteQuestionnaireHandler`) con una `SupabaseService` real apuntando al stack local — sin
 * pasar por `AppModule`/Nest DI (no hace falta: ninguna de las dos depende de nada más que
 * `SupabaseService`, y aquí se les inyecta a mano), solo un `EventBus` de mentira porque lo que
 * importa es la escritura en BD, no la propagación del evento.
 */
describe('questionnaires — upsert contra el stack local real (tarea 7.9)', () => {
  const admin = createSupabaseAdminTestClient();
  let questionnairesService: QuestionnairesService;
  let completeHandler: CompleteQuestionnaireHandler;
  let eventBus: { publish: jest.Mock };
  let userId: string;

  beforeEach(async () => {
    const supabaseService = new SupabaseService();
    eventBus = { publish: jest.fn() };
    questionnairesService = new QuestionnairesService(supabaseService);
    completeHandler = new CompleteQuestionnaireHandler(
      supabaseService,
      eventBus as unknown as EventBus,
    );

    const [account] = getTestAccountPool();
    const profile = await createTestUser(admin, { authUserId: account.id });
    userId = profile.id;
  });

  it('saveDraft: un segundo guardado sobrescribe el primero en la misma fila, sin duplicarla', async () => {
    await questionnairesService.saveDraft(userId, buildAnswers(5));
    await questionnairesService.saveDraft(userId, buildAnswers(15));

    const { data, error } = await admin.from('questionnaires').select('*').eq('user_id', userId);
    const rows = data as Array<{ answers: unknown[] }> | null;

    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0].answers).toHaveLength(15);
  });

  it('CompleteQuestionnaireHandler: completa sobre un borrador ya existente sin chocar con UNIQUE(user_id)', async () => {
    // Este es exactamente el escenario que motivó usar `upsert` en vez de `insert` (comentario en
    // complete-questionnaire.handler.ts): el usuario ya autoguardó un borrador parcial antes de
    // pulsar "Enviar cuestionario".
    await createTestQuestionnaire(admin, { userId, answers: buildAnswers(10), completed: false });

    const answers = buildAnswers(36);
    const result = await completeHandler.execute(new CompleteQuestionnaireCommand(userId, answers));

    expect(result).toEqual(answers);

    const { data, error } = await admin.from('questionnaires').select('*').eq('user_id', userId);
    const rows = data as Array<{ answers: unknown[] }> | null;
    expect(error).toBeNull();
    expect(rows).toHaveLength(1); // sigue siendo UNA fila, no chocó con UNIQUE(user_id)
    expect(rows?.[0].answers).toHaveLength(36);

    const { data: userRow } = await admin
      .from('users')
      .select('questionnaire_completed_at')
      .eq('id', userId)
      .single();
    expect(
      (userRow as { questionnaire_completed_at: string | null }).questionnaire_completed_at,
    ).not.toBeNull();
    expect(eventBus.publish).toHaveBeenCalledTimes(1);
  });

  it('CompleteQuestionnaireHandler: sin borrador previo, inserta la fila (camino ya cubierto por e2e, confirmado también contra BD real)', async () => {
    const answers = buildAnswers(36);

    await completeHandler.execute(new CompleteQuestionnaireCommand(userId, answers));

    const { data, error } = await admin.from('questionnaires').select('*').eq('user_id', userId);
    const rows = data as Array<{ answers: unknown[] }> | null;
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
  });
});
