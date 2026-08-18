import { randomUUID } from 'node:crypto';
import { EventBus } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { ChatService } from '../../src/chat/chat.service';
import { CandidateSelectorService } from '../../src/matching/candidate-selector.service';
import { RecalculateCompatibilityCommand } from '../../src/matching/commands/recalculate-compatibility.command';
import { RecalculateCompatibilityHandler } from '../../src/matching/commands/recalculate-compatibility.handler';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { createComparison } from '../factories/create-comparison';
import { createTestQuestionnaire } from '../factories/create-test-questionnaire';
import { createTestUser } from '../factories/create-test-user';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

/**
 * internal-chat spec, Requirement "Las conversaciones no dependen del estado actual de las
 * comparaciones": la garantía de que recalcular no borra `conversations`/`messages` de un usuario,
 * aunque el candidato con el que hablaba deje de ser uno de sus 3 nuevos candidatos, hasta ahora solo
 * se sostenía por diseño de esquema (sin FK entre `conversations`/`messages` y `comparisons`,
 * `supabase/migrations/0001_init.sql`) — ningún test la ejercitaba de extremo a extremo contra
 * Postgres real. Este archivo cierra ese hueco.
 *
 * `RecalculateCompatibilityHandler` (sección 8) borra TODAS las `comparisons` de
 * `requester_user_id` antes de reinsertar las nuevas (ver su comentario de cabecera), y
 * `candidate-selector.service.ts` no tiene ningún umbral mínimo de cualidades compartidas: se queda
 * sin más con el top 3 de quienes haya disponibles. Por eso, para que B deje de verdad de ser
 * candidato de A en el recálculo, hacen falta otros 3 usuarios con más cualidades compartidas con A
 * que B — con el pool fijo de 4 cuentas (`test-account-pool.ts`) no alcanza (A + B + 2 más = como
 * mucho 3 "otros" candidatos, que entrarían siempre en el top 3 sin importar sus cualidades). De ahí
 * la quinta cuenta de Auth que este test crea a mano (mismo mecanismo que `supabase/seed/seed.ts`,
 * `admin.auth.admin.createUser`) y borra al terminar, porque `resetDomainTables()` limpia las tablas
 * de dominio entre tests pero nunca toca `auth.users` (ver su propio comentario de cabecera).
 */

// Mismo motivo que `SEED_TEST_TIMEOUT_MS` (seed.integration-spec.ts): crear/borrar una cuenta de
// Auth de verdad contra el stack local, sumado a la treintena de idas y vueltas a Postgres/PostgREST
// de este único test, puede superar de sobra el timeout por defecto de Jest (5000 ms).
const RECALCULATION_TEST_TIMEOUT_MS = 30000;

function buildAnswers(): Array<{ questionId: number; question: string; answer: string }> {
  return Array.from({ length: 36 }, (_, i) => ({
    questionId: i + 1,
    question: `Pregunta ${i + 1}`,
    answer: `Respuesta ${i + 1}`,
  }));
}

// Mismo patrón que `ai-orchestrator.integration-spec.ts`: un logger mudo de verdad, porque lo que
// importa aquí es la escritura en BD, no lo que `candidate-selector.service.ts` registre por el camino.
function buildSilentLogger(): PinoLogger {
  return {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    setContext: () => undefined,
  } as unknown as PinoLogger;
}

// Mismo motivo que `idOf` en `rls-policies.integration-spec.ts`: el cliente de Supabase sin tipar
// devuelve `any`, y el `as` solo puede vivir dentro de un `return` para que `eslint --fix` no lo
// elimine por "innecesario" (ya pasó una vez en este mismo proyecto).
function idOf(row: unknown): string {
  return (row as { id: string }).id;
}

describe('el chat sobrevive a un recálculo de compatibilidad (internal-chat spec)', () => {
  const admin = createSupabaseAdminTestClient();
  let extraAuthUserId: string | null = null;

  afterEach(async () => {
    // Limpieza simétrica a `deleteSeedAuthUsers` (seed.integration-spec.ts): `resetDomainTables()`
    // (setupFilesAfterEnv) trunca las tablas de dominio automáticamente tras cada test, pero nunca
    // `auth.users` — la cuenta de relleno creada a mano aquí hay que borrarla nosotros mismos, o
    // quedaría huérfana en el stack local para siempre.
    if (extraAuthUserId) {
      await admin.auth.admin.deleteUser(extraAuthUserId);
      extraAuthUserId = null;
    }
  });

  it(
    'conserva conversations/messages tras un recálculo que descarta al candidato con el que se hablaba',
    async () => {
      const [a, b, c, d] = getTestAccountPool();

      const fillerEmail = `chat-survives-filler-${randomUUID()}@integration-test.afinia.local`;
      const fillerPassword = `TestFiller-${randomUUID()}`;
      const { data: createdFiller, error: createFillerError } = await admin.auth.admin.createUser({
        email: fillerEmail,
        password: fillerPassword,
        email_confirm: true,
      });
      if (createFillerError || !createdFiller.user) {
        throw new Error(`No se pudo crear la cuenta de relleno: ${createFillerError?.message}`);
      }
      extraAuthUserId = createdFiller.user.id;

      // A y B, con cuestionario completo de verdad (vía factory) — son los dos extremos de la
      // conversación cuya persistencia se está probando.
      const userA = await createTestUser(admin, { authUserId: a.id, name: 'Usuaria A' });
      const userB = await createTestUser(admin, { authUserId: b.id, name: 'Usuario B' });
      await createTestQuestionnaire(admin, { userId: userA.id, answers: buildAnswers() });
      await createTestQuestionnaire(admin, { userId: userB.id, answers: buildAnswers() });

      // C, D y la cuenta de relleno solo existen para ganarle a B en cualidades compartidas con A
      // durante el recálculo — necesitan cuestionario completo (filtro de
      // `candidate-selector.service.ts`), pero no una fila real en `questionnaires`: el servicio solo
      // mira `users.questionnaire_completed_at`.
      const fillerC = await createTestUser(admin, {
        authUserId: c.id,
        name: 'Relleno C',
        questionnaireCompletedAt: new Date().toISOString(),
      });
      const fillerD = await createTestUser(admin, {
        authUserId: d.id,
        name: 'Relleno D',
        questionnaireCompletedAt: new Date().toISOString(),
      });
      const fillerE = await createTestUser(admin, {
        authUserId: extraAuthUserId,
        name: 'Relleno E',
        questionnaireCompletedAt: new Date().toISOString(),
      });

      // Una única cualidad, compartida entre A y los 3 rellenos; B se queda deliberadamente sin
      // ninguna. 0 coincidencias es la puntuación mínima posible, así que en el recálculo real B
      // siempre queda por detrás de los 3 rellenos (1 coincidencia cada uno) y el top 3 los agota.
      const { data: qualityRow, error: qualityError } = await admin
        .from('qualities')
        .insert({ name: `Cualidad de test ${randomUUID()}` })
        .select('id')
        .single();
      if (qualityError) {
        throw new Error(`No se pudo crear la cualidad de test: ${qualityError.message}`);
      }
      const qualityId = idOf(qualityRow);

      const { error: userQualitiesError } = await admin.from('user_qualities').insert([
        { user_id: userA.id, quality_id: qualityId },
        { user_id: fillerC.id, quality_id: qualityId },
        { user_id: fillerD.id, quality_id: qualityId },
        { user_id: fillerE.id, quality_id: qualityId },
      ]);
      if (userQualitiesError) {
        throw new Error(
          `No se pudieron asignar las cualidades de test: ${userQualitiesError.message}`,
        );
      }

      // 1) Estado de partida: B es candidato de A, y ya existe una conversación con al menos un
      // mensaje entre ambos — creada a través de `ChatService` real (no con un insert a mano) para que
      // exista exactamente como la crearía la aplicación, elegibilidad contra `comparisons` incluida.
      const originalComparison = await createComparison(admin, {
        requesterUserId: userA.id,
        candidateUserId: userB.id,
      });

      const supabaseService = new SupabaseService();
      const chatService = new ChatService(supabaseService);
      const { id: conversationId } = await chatService.startConversation(userA.id, userB.id);
      const sentMessage = await chatService.sendMessage(
        conversationId,
        userA.id,
        'Hola, tu perfil me ha parecido muy compatible',
      );

      // 2) Se fuerza el recálculo pendiente en A y se ejecuta el handler real — mismo camino que
      // `POST /users/me/recalculate`, sin pasar por HTTP, instanciando las clases reales directamente
      // (mismo patrón que `questionnaires.integration-spec.ts`/`ai-orchestrator.integration-spec.ts`).
      const { error: flagError } = await admin
        .from('users')
        .update({ needs_recalculation: true })
        .eq('id', userA.id);
      if (flagError) {
        throw new Error(`No se pudo forzar needs_recalculation en A: ${flagError.message}`);
      }

      const candidateSelectorService = new CandidateSelectorService(
        supabaseService,
        buildSilentLogger(),
      );
      const eventBus = { publish: jest.fn() };
      const handler = new RecalculateCompatibilityHandler(
        supabaseService,
        candidateSelectorService,
        eventBus as unknown as EventBus,
      );

      const selected = await handler.execute(new RecalculateCompatibilityCommand(userA.id));

      // B ya no es uno de los 3 nuevos candidatos de A: lo desplazan los 3 rellenos, que comparten una
      // cualidad con A frente a las 0 de B.
      const selectedCandidateIds = selected.map((s) => s.candidateUserId);
      expect(selectedCandidateIds).toHaveLength(3);
      expect(new Set(selectedCandidateIds)).toEqual(new Set([fillerC.id, fillerD.id, fillerE.id]));
      expect(selectedCandidateIds).not.toContain(userB.id);

      // La fila antigua de `comparisons` entre A y B, en efecto, ha sido sustituida/borrada por el
      // recálculo (el propio handler borra todas las de A antes de reinsertar las nuevas).
      const { data: staleComparison } = await admin
        .from('comparisons')
        .select('id')
        .eq('id', originalComparison.id)
        .maybeSingle();
      expect(staleComparison).toBeNull();

      // 3) La conversación y su mensaje, sin embargo, siguen intactos en BD — la garantía que exige el
      // requirement "Las conversaciones no dependen del estado actual de las comparaciones".
      const { data: conversationRow, error: conversationError } = await admin
        .from('conversations')
        .select('id, user_a_id, user_b_id')
        .eq('id', conversationId)
        .maybeSingle();
      expect(conversationError).toBeNull();
      expect(conversationRow).not.toBeNull();

      const { data: messageRows, error: messagesError } = await admin
        .from('messages')
        .select('id, body, sender_id')
        .eq('conversation_id', conversationId);
      expect(messagesError).toBeNull();
      expect(messageRows).toHaveLength(1);
      expect(idOf((messageRows as unknown[])[0])).toBe(sentMessage.id);
    },
    RECALCULATION_TEST_TIMEOUT_MS,
  );
});
