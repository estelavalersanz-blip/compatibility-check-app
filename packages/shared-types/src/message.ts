/**
 * Un mensaje de texto simple dentro de una conversación del chat interno (internal-chat spec,
 * "Envío y recepción de mensajes dentro de una conversación").
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}
