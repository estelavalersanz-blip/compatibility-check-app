import { Message, UserProfile } from '@compatibility-check-app/shared-types';

/** Forma de una fila de `conversations` tal como la devuelve Supabase (snake_case). */
export interface ConversationRow {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}
export function asConversationRow(row: unknown): ConversationRow | null {
  return row as ConversationRow | null;
}
export function asConversationRows(rows: unknown): ConversationRow[] {
  return (rows as ConversationRow[] | null) ?? [];
}
export const CONVERSATION_COLUMNS = 'id, user_a_id, user_b_id, created_at';

/** Forma de una fila de `messages` tal como la devuelve Supabase (snake_case). */
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}
export function asMessageRow(row: unknown): MessageRow | null {
  return row as MessageRow | null;
}
export function asMessageRows(rows: unknown): MessageRow[] {
  return (rows as MessageRow[] | null) ?? [];
}
export const MESSAGE_COLUMNS = 'id, conversation_id, sender_id, body, created_at, read_at';

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/**
 * Mismas columnas que `comparisons/comparison.mapper.ts` necesita para `UserProfile` —
 * redeclaradas aquí a propósito, no importadas: cada módulo mapea sus propias filas sin importar
 * servicios de otro (mismo límite entre módulos que ya respetan `matching`/`comparisons`).
 */
export interface ParticipantRow {
  id: string;
  name: string;
  alias: string;
  photo_url: string | null;
  questionnaire_completed_at: string | null;
}
export function asParticipantRows(rows: unknown): ParticipantRow[] {
  return (rows as ParticipantRow[] | null) ?? [];
}
export const PARTICIPANT_COLUMNS = 'id, name, alias, photo_url, questionnaire_completed_at';

export function toUserProfile(row: ParticipantRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias,
    photoUrl: row.photo_url,
    questionnaireCompletedAt: row.questionnaire_completed_at,
  };
}
