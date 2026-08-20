import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Conversation, Message } from '@compatibility-check-app/shared-types';
import {
  asConversationRow,
  asConversationRows,
  asMessageRows,
  asParticipantRows,
  CONVERSATION_COLUMNS,
  ConversationRow,
  decryptMessageRow,
  MESSAGE_COLUMNS,
  MessageRow,
  PARTICIPANT_COLUMNS,
  toMessage,
  toUserProfile,
} from './chat.mapper';
import { encryptMessageBody } from './message-encryption';
import { POSTGRES_UNIQUE_VIOLATION } from '../supabase/postgres-error-codes';
import { SupabaseService } from '../supabase/supabase.service';
import { writableTable } from '../supabase/writable-table';

type RealSupabaseClient = ReturnType<SupabaseService['getClient']>;

/**
 * Ordena el par para cumplir `user_a_id < user_b_id` (design.md, decisión 9; `CHECK` en
 * `0001_init.sql`): la comparación de string en JS sobre el UUID canónico (minúsculas, guiones
 * siempre en la misma posición en cualquier UUID v4) da el mismo orden que el operador `<` de
 * Postgres para `uuid` — compara los mismos bytes, en el mismo orden.
 */
function sortUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/**
 * Servicio normal, sin Command (design.md, decisión 6b — mismo criterio que `ComparisonsService`):
 * el chat no dispara ningún evento de dominio ni tiene que reaccionar a uno; solo persistencia
 * directa con las comprobaciones de elegibilidad/pertenencia de design.md, decisión 9.
 */
@Injectable()
export class ChatService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * `POST /conversations`: solo puede iniciarla quien tenga a `candidateUserId` entre sus propias
   * `comparisons` como `requester_user_id` (elegibilidad direccional, no exige la relación
   * inversa — igual que la selección de candidatos de `matching`). Idempotente: si ya existía la
   * conversación entre ambos, la devuelve tal cual en vez de duplicarla.
   */
  async startConversation(
    requesterUserId: string,
    candidateUserId: string,
  ): Promise<{ id: string }> {
    const client = this.supabaseService.getClient();

    const { data: eligibilityRow, error: eligibilityError } = await client
      .from('comparisons')
      .select('id')
      .eq('requester_user_id', requesterUserId)
      .eq('candidate_user_id', candidateUserId)
      .maybeSingle();
    if (eligibilityError) {
      throw new Error(
        `No se pudo comprobar la elegibilidad del candidato: ${eligibilityError.message}`,
      );
    }
    if (!eligibilityRow) {
      throw new BadRequestException('Ese usuario no es uno de tus candidatos actuales');
    }

    const [userAId, userBId] = sortUserIds(requesterUserId, candidateUserId);

    const existing = await this.findConversation(client, userAId, userBId);
    if (existing) {
      return { id: existing.id };
    }

    const { data: insertedRow, error: insertError } = await writableTable(client, 'conversations')
      .insert({ user_a_id: userAId, user_b_id: userBId })
      .select(CONVERSATION_COLUMNS)
      .single();
    if (insertError) {
      // Condición de carrera real (dos POST /conversations casi simultáneos para el mismo par,
      // igual que la 6.4 con el alias): la restricción UNIQUE de BD es la que de verdad decide;
      // aquí se traduce a la misma respuesta idempotente, nunca a un error.
      if (insertError.code === POSTGRES_UNIQUE_VIOLATION) {
        const raceWinner = await this.findConversation(client, userAId, userBId);
        if (raceWinner) {
          return { id: raceWinner.id };
        }
      }
      throw new Error(`No se pudo crear la conversación: ${insertError.message}`);
    }

    return { id: (asConversationRow(insertedRow) as ConversationRow).id };
  }

  /**
   * `GET /conversations` (internal-chat spec, "Acceso a todas las conversaciones propias desde el
   * menú"): incluye tanto las conversaciones que el usuario inició como las que otro usuario le
   * inició a él — nunca se construye a partir de sus propias `comparisons` (design.md, decisión 9).
   * Ordenadas por actividad más reciente: la fecha del último mensaje, o la de creación de la
   * conversación si todavía no tiene ningún mensaje.
   */
  async listConversations(userId: string): Promise<Conversation[]> {
    const client = this.supabaseService.getClient();

    const [asUserA, asUserB] = await Promise.all([
      client.from('conversations').select(CONVERSATION_COLUMNS).eq('user_a_id', userId),
      client.from('conversations').select(CONVERSATION_COLUMNS).eq('user_b_id', userId),
    ]);
    if (asUserA.error) {
      throw new Error(`No se pudieron consultar las conversaciones: ${asUserA.error.message}`);
    }
    if (asUserB.error) {
      throw new Error(`No se pudieron consultar las conversaciones: ${asUserB.error.message}`);
    }
    const conversations = [
      ...asConversationRows(asUserA.data),
      ...asConversationRows(asUserB.data),
    ];
    if (conversations.length === 0) {
      return [];
    }

    const otherUserIds = conversations.map((row) =>
      row.user_a_id === userId ? row.user_b_id : row.user_a_id,
    );
    const { data: participantRows, error: participantsError } = await client
      .from('users')
      .select(PARTICIPANT_COLUMNS)
      .in('id', otherUserIds);
    if (participantsError) {
      throw new Error(`No se pudieron consultar los participantes: ${participantsError.message}`);
    }
    const participantsById = new Map(
      asParticipantRows(participantRows).map((row) => [row.id, row]),
    );

    const conversationIds = conversations.map((row) => row.id);
    const { data: messageRows, error: messagesError } = await client
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true });
    if (messagesError) {
      throw new Error(`No se pudieron consultar los mensajes: ${messagesError.message}`);
    }
    const messagesByConversation = new Map<string, MessageRow[]>();
    for (const row of asMessageRows(messageRows)) {
      const list = messagesByConversation.get(row.conversation_id) ?? [];
      list.push(row);
      messagesByConversation.set(row.conversation_id, list);
    }

    const withSortKey = conversations.map((row) => {
      const otherUserId = row.user_a_id === userId ? row.user_b_id : row.user_a_id;
      const participantRow = participantsById.get(otherUserId);
      if (!participantRow) {
        throw new Error(`No se encontró el perfil del participante "${otherUserId}"`);
      }
      // Ordenados ascendente arriba: el último elemento de cada grupo es el mensaje más reciente.
      // `unreadCount` no necesita el body (nunca se descifra solo para contar), pero `lastMessage`
      // sí se muestra como vista previa en el listado — pasa por `decryptMessageRow` igual que en
      // `getMessages`.
      const conversationMessages = messagesByConversation.get(row.id) ?? [];
      const lastRow = conversationMessages[conversationMessages.length - 1] ?? null;
      const unreadCount = conversationMessages.filter(
        (message) => message.sender_id !== userId && message.read_at === null,
      ).length;

      const conversation: Conversation = {
        id: row.id,
        otherParticipant: toUserProfile(participantRow),
        lastMessage: lastRow ? toMessage(decryptMessageRow(lastRow)) : null,
        unreadCount,
      };
      return { conversation, sortKey: lastRow?.created_at ?? row.created_at };
    });

    return withSortKey
      .sort((a, b) => (a.sortKey < b.sortKey ? 1 : a.sortKey > b.sortKey ? -1 : 0))
      .map((entry) => entry.conversation);
  }

  /**
   * `GET /conversations/:id/messages` (`?after=<cursor ISO>` opcional, tarea 17b.5/17b.6): exige ser
   * participante (mismo 404 tanto si la conversación no existe como si existe pero no es suya —
   * minimización de información, igual criterio que `ComparisonsService.findDetail`) y marca como
   * leídos los mensajes dirigidos al usuario autenticado (nunca los que él mismo envió) que
   * siguieran sin leer — **sobre toda la conversación, no solo sobre la porción devuelta por
   * `after`**: mientras la conversación está abierta y se sondea, cualquier mensaje nuevo se
   * considera leído de inmediato, no solo el primero que se cargó al entrar.
   */
  async getMessages(conversationId: string, userId: string, after?: string): Promise<Message[]> {
    const client = this.supabaseService.getClient();
    await this.assertParticipant(client, conversationId, userId);

    let query = client
      .from('messages')
      .select(MESSAGE_COLUMNS)
      .eq('conversation_id', conversationId);
    if (after) {
      query = query.gt('created_at', after);
    }
    const { data: messageRows, error: messagesError } = await query.order('created_at', {
      ascending: true,
    });
    if (messagesError) {
      throw new Error(`No se pudieron consultar los mensajes: ${messagesError.message}`);
    }

    const readAt = new Date().toISOString();
    const { error: markReadError } = await writableTable(client, 'messages')
      .update({ read_at: readAt })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);
    if (markReadError) {
      throw new Error(`No se pudieron marcar los mensajes como leídos: ${markReadError.message}`);
    }

    // Refleja en la respuesta el `read_at` que se acaba de aplicar, sin una segunda consulta: son
    // exactamente las mismas filas que cumplían el filtro del `update` de arriba. Descifra antes de
    // mapear a `Message` -- `decryptMessageRow` es un passthrough para filas anteriores al cifrado.
    return asMessageRows(messageRows)
      .map(decryptMessageRow)
      .map((row) =>
        row.sender_id !== userId && row.read_at === null ? { ...row, read_at: readAt } : row,
      )
      .map(toMessage);
  }

  /**
   * `POST /conversations/:id/messages`: exige ser participante (mismo criterio que `getMessages`)
   * y un `body` no vacío tras recortar espacios — el controller ya lo comprueba, pero se revalida
   * aquí por si este servicio se llama alguna vez desde otro sitio.
   *
   * Cifra `trimmedBody` antes de insertar (cifrado en reposo, ver `message-encryption.ts`) — nunca
   * llega texto plano a la fila de `messages`. La respuesta se construye con el `trimmedBody` que
   * ya se tiene a mano, en vez de descifrar la fila recién insertada: mismo resultado, sin un
   * cifrado-descifrado redundante en la misma petición.
   */
  async sendMessage(conversationId: string, userId: string, body: string): Promise<Message> {
    const client = this.supabaseService.getClient();
    await this.assertParticipant(client, conversationId, userId);

    const trimmedBody = body.trim();
    if (!trimmedBody) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }

    const encrypted = encryptMessageBody(trimmedBody);
    const { data, error } = await writableTable(client, 'messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
      })
      .select(MESSAGE_COLUMNS)
      .single();
    if (error) {
      throw new Error(`No se pudo enviar el mensaje: ${error.message}`);
    }

    return toMessage({ ...(data as MessageRow), body: trimmedBody });
  }

  private async findConversation(
    client: RealSupabaseClient,
    userAId: string,
    userBId: string,
  ): Promise<ConversationRow | null> {
    const { data, error } = await client
      .from('conversations')
      .select(CONVERSATION_COLUMNS)
      .eq('user_a_id', userAId)
      .eq('user_b_id', userBId)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar la conversación existente: ${error.message}`);
    }
    return asConversationRow(data);
  }

  private async assertParticipant(
    client: RealSupabaseClient,
    conversationId: string,
    userId: string,
  ): Promise<ConversationRow> {
    const { data, error } = await client
      .from('conversations')
      .select(CONVERSATION_COLUMNS)
      .eq('id', conversationId)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar la conversación: ${error.message}`);
    }
    const conversation = asConversationRow(data);
    if (!conversation || (conversation.user_a_id !== userId && conversation.user_b_id !== userId)) {
      throw new NotFoundException('No existe esa conversación');
    }
    return conversation;
  }
}
