import { createComparison } from '../factories/create-comparison';
import { createTestQuestionnaire } from '../factories/create-test-questionnaire';
import { createTestUser } from '../factories/create-test-user';
import {
  createSupabaseAdminTestClient,
  createSupabaseUserTestClient,
} from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

// El cliente de Supabase sin tipar devuelve `any` en `data`; envolver el cast en una función con
// tipo de retorno declarado evita que `@typescript-eslint/no-unsafe-assignment` se dispare al
// asignarlo a una variable (a diferencia de un `as` suelto, que --fix considera "innecesario" y
// termina quitando, reintroduciendo el error).
function idOf(row: unknown): string {
  return (row as { id: string }).id;
}

/**
 * RLS (design.md, decisión 11): un usuario autenticado con su propio JWT real
 * (`signInWithPassword`, nunca `service_role`) solo puede leer/escribir su propia fila de
 * `users`/`questionnaires`, y solo las `conversations`/`messages` de las que participa —
 * ejercitado contra el cliente directo de Supabase, sin pasar por el backend.
 */
describe('políticas RLS', () => {
  const admin = createSupabaseAdminTestClient();
  let userA: { id: string; email: string; password: string; alias: string };
  let userB: { id: string; email: string; password: string; alias: string };
  let userC: { id: string; email: string; password: string; alias: string };
  let userD: { id: string; email: string; password: string; alias: string };

  beforeEach(async () => {
    const pool = getTestAccountPool();
    const [a, b, c, d] = pool;

    const profileA = await createTestUser(admin, { authUserId: a.id, name: 'Usuario A' });
    const profileB = await createTestUser(admin, { authUserId: b.id, name: 'Usuario B' });
    const profileC = await createTestUser(admin, { authUserId: c.id, name: 'Usuario C' });
    const profileD = await createTestUser(admin, { authUserId: d.id, name: 'Usuario D' });

    userA = { ...a, alias: profileA.alias };
    userB = { ...b, alias: profileB.alias };
    userC = { ...c, alias: profileC.alias };
    userD = { ...d, alias: profileD.alias };
  });

  describe('users', () => {
    it('un usuario puede leer y actualizar su propia fila (control positivo)', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const ownResult = await clientA.from('users').select('*').eq('id', userA.id).single();
      const own = ownResult.data as { id: string } | null;
      expect(own?.id).toBe(userA.id);

      const { error: updateError } = await clientA
        .from('users')
        .update({ name: 'Usuario A renombrado' })
        .eq('id', userA.id);
      expect(updateError).toBeNull();

      const { data: reloaded } = await admin
        .from('users')
        .select('name')
        .eq('id', userA.id)
        .single();
      expect(reloaded?.name).toBe('Usuario A renombrado');
    });

    it('un usuario no puede leer la fila de otro usuario', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { data, error } = await clientA.from('users').select('*').eq('id', userB.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('un usuario no puede actualizar la fila de otro usuario', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      await clientA.from('users').update({ name: 'Hackeado' }).eq('id', userB.id);

      const { data: stillIntact } = await admin
        .from('users')
        .select('name')
        .eq('id', userB.id)
        .single();
      expect(stillIntact?.name).toBe('Usuario B');
    });
  });

  describe('questionnaires', () => {
    beforeEach(async () => {
      await createTestQuestionnaire(admin, {
        userId: userB.id,
        answers: [{ questionId: 1, question: '¿Pregunta?', answer: 'Respuesta de B' }],
      });
    });

    it('un usuario no puede leer el cuestionario de otro usuario', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { data, error } = await clientA
        .from('questionnaires')
        .select('*')
        .eq('user_id', userB.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('un usuario no puede insertar un cuestionario a nombre de otro usuario', async () => {
      // userC, no userB: userB ya tiene fila (por el beforeEach de este describe) y su
      // `UNIQUE(user_id)` por sí solo bastaría para rechazar un segundo insert, sin que eso
      // demuestre nada sobre RLS. userC no tiene cuestionario todavía en este bloque.
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { error } = await clientA
        .from('questionnaires')
        .insert({ user_id: userC.id, answers: [] });

      expect(error).not.toBeNull();

      const { data: stillNone } = await admin
        .from('questionnaires')
        .select('id')
        .eq('user_id', userC.id);
      expect(stillNone).toEqual([]);
    });
  });

  describe('conversations y messages', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Normalizado user_a_id < user_b_id para satisfacer el CHECK de 0001_init.sql — en
      // producción lo hace chat.service.ts (sección 10b), aquí lo hacemos a mano en el factory.
      const [first, second] = [userC.id, userD.id].sort();
      const { data, error } = await admin
        .from('conversations')
        .insert({ user_a_id: first, user_b_id: second })
        .select('id')
        .single();

      if (error) throw error;
      conversationId = idOf(data);

      await admin.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userC.id,
        body: 'Hola, D',
      });
    });

    it('un participante puede leer y enviar mensajes (control positivo)', async () => {
      const clientC = await createSupabaseUserTestClient(userC.email, userC.password);

      const { data: messages } = await clientC
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);
      expect(messages).toHaveLength(1);

      const { error: insertError } = await clientC.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userC.id,
        body: 'Un segundo mensaje',
      });
      expect(insertError).toBeNull();
    });

    it('un usuario que no participa no puede leer la conversación', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { data, error } = await clientA
        .from('conversations')
        .select('*')
        .eq('id', conversationId);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('un usuario que no participa no puede leer los mensajes de la conversación', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { data, error } = await clientA
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('un usuario que no participa no puede escribir en la conversación', async () => {
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { error } = await clientA.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userA.id,
        body: 'Intento colarme en la conversación',
      });

      expect(error).not.toBeNull();

      const { data: messages } = await admin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);
      expect(messages).toHaveLength(1); // sigue solo el mensaje original de C
    });
  });

  describe('candidate-matching (comparisons no expuesta directamente)', () => {
    it('un usuario no puede leer sus propias comparaciones a través del cliente directo', async () => {
      await createComparison(admin, { requesterUserId: userA.id, candidateUserId: userB.id });
      const clientA = await createSupabaseUserTestClient(userA.email, userA.password);

      const { data, error } = await clientA
        .from('comparisons')
        .select('*')
        .eq('requester_user_id', userA.id);

      // Sin GRANT a `authenticated` (0001_init.sql), la tabla ni siquiera es visible por esta vía
      // — es intencional (decisión 3c): solo el backend con `service_role` accede a `comparisons`.
      expect(data ?? []).toEqual([]);
      void error;
    });
  });
});
