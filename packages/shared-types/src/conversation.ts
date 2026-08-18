import type { Message } from './message';
import type { UserProfile } from './user-profile';

/**
 * Una conversación del chat interno, tal como la consume el listado de `features/chats`
 * (internal-chat spec, "Acceso a todas las conversaciones propias desde el menú"). `otherParticipant`
 * ya viene resuelto al participante contrario al usuario autenticado — el frontend nunca tiene que
 * comparar `user_a_id`/`user_b_id` por su cuenta.
 */
export interface Conversation {
  id: string;
  otherParticipant: UserProfile;
  lastMessage: Message | null;
  unreadCount: number;
}
