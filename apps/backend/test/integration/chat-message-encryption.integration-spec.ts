import { ChatService } from '../../src/chat/chat.service';
import { SupabaseService } from '../../src/supabase/supabase.service';
import { createComparison } from '../factories/create-comparison';
import { createTestUser } from '../factories/create-test-user';
import { createSupabaseAdminTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

/**
 * internal-chat spec, requirement nueva "Cifrado en reposo del cuerpo de los mensajes": hasta ahora
 * `messages.body` se guardaba en texto plano en Postgres — este archivo cierra el hueco de
 * verificarlo contra el stack real, no solo contra un `SupabaseService` mockeado (que no puede
 * demostrar que la fila cruda de BD queda cifrada de verdad).
 */

describe('cifrado en reposo de los mensajes de chat (internal-chat spec)', () => {
  const admin = createSupabaseAdminTestClient();

  it('guarda el body cifrado en la fila cruda de BD, y lo descifra de vuelta a través del servicio', async () => {
    const [a, b] = getTestAccountPool();
    const userA = await createTestUser(admin, { authUserId: a.id, name: 'Usuaria A' });
    const userB = await createTestUser(admin, { authUserId: b.id, name: 'Usuario B' });
    await createComparison(admin, { requesterUserId: userA.id, candidateUserId: userB.id });

    const plainText = 'Hola, ¿qué tal si hablamos de nuestras cualidades en común?';
    const chatService = new ChatService(new SupabaseService());
    const { id: conversationId } = await chatService.startConversation(userA.id, userB.id);
    const sentMessage = await chatService.sendMessage(conversationId, userA.id, plainText);

    // La respuesta del propio `sendMessage` ya devuelve el texto en claro al llamador.
    expect(sentMessage.body).toBe(plainText);

    // La fila cruda en BD, en cambio, nunca contiene el texto en claro -- inspeccionada con el
    // cliente admin, sin pasar por `ChatService` (que es justo lo que hay que verificar aquí).
    const { data: rawRow, error: rawError } = await admin
      .from('messages')
      .select('body, iv, auth_tag')
      .eq('id', sentMessage.id)
      .single();
    expect(rawError).toBeNull();
    const row = rawRow as { body: string; iv: string | null; auth_tag: string | null };
    expect(row.body).not.toBe(plainText);
    expect(row.body).not.toContain(plainText);
    expect(row.iv).not.toBeNull();
    expect(row.auth_tag).not.toBeNull();

    // Y `getMessages` (el camino real de lectura, `GET /conversations/:id/messages`) descifra de
    // vuelta al texto original.
    const fetched = await chatService.getMessages(conversationId, userB.id);
    expect(fetched).toHaveLength(1);
    expect(fetched[0].body).toBe(plainText);
  });

  it('sigue leyendo correctamente un mensaje "heredado" sin iv/auth_tag (compatibilidad hacia atrás)', async () => {
    const [, , c, d] = getTestAccountPool();
    const userC = await createTestUser(admin, { authUserId: c.id, name: 'Usuaria C' });
    const userD = await createTestUser(admin, { authUserId: d.id, name: 'Usuario D' });
    await createComparison(admin, { requesterUserId: userC.id, candidateUserId: userD.id });

    const chatService = new ChatService(new SupabaseService());
    const { id: conversationId } = await chatService.startConversation(userC.id, userD.id);

    // Simula una fila de antes del cifrado: insertada directamente en texto plano, sin iv/auth_tag
    // (el propio `ChatService.sendMessage` ya nunca hace esto -- este insert imita datos previos a
    // este cambio, no una vía de escritura real de la aplicación).
    const legacyPlainText = 'mensaje de antes de que existiera el cifrado';
    const { error: insertError } = await admin
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: userC.id, body: legacyPlainText });
    expect(insertError).toBeNull();

    const fetched = await chatService.getMessages(conversationId, userD.id);
    expect(fetched).toHaveLength(1);
    expect(fetched[0].body).toBe(legacyPlainText);
  });
});
