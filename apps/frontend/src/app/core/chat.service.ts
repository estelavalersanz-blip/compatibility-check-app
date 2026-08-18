import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Conversation, Message } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `conversations` (internal-chat spec). Vive en `core/` porque el propio `core/shell` lo necesita
 * para el indicador de no leídos (tarea 11.2c), y `features/chats` (sección 17b) reutiliza el mismo
 * servicio para el listado/conversación reales en vez de duplicarlo.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);

  listConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${environment.apiBaseUrl}/conversations`);
  }

  /** `POST /conversations` — botón "Chatear" de cada tarjeta de `features/results-dashboard`
   *  (sección 16); idempotente en el backend (crea o devuelve la ya existente), la UI nunca decide
   *  cuál de las dos ocurrió. Solo devuelve el id — el resto de la conversación se carga al navegar
   *  a `features/chats/:id` (sección 17b). */
  startConversation(candidateUserId: string): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${environment.apiBaseUrl}/conversations`, {
      candidateUserId,
    });
  }

  /** `GET /conversations/:id/messages` — sin `after`, historial completo (primera carga); con
   *  `after` (cursor ISO del último mensaje ya recibido), solo los posteriores (tarea 17b.5/17b.6,
   *  sondeo cada ~4s sin recargar toda la conversación). */
  getMessages(conversationId: string, after?: string): Observable<Message[]> {
    return this.http.get<Message[]>(
      `${environment.apiBaseUrl}/conversations/${conversationId}/messages`,
      after ? { params: { after } } : {},
    );
  }

  /** `POST /conversations/:id/messages` — el backend rechaza un `body` vacío (400), el formulario
   *  ya lo bloquea antes de llegar aquí (mismo criterio de "cliente bloquea, backend es la fuente de
   *  verdad" del resto del proyecto). */
  sendMessage(conversationId: string, body: string): Observable<Message> {
    return this.http.post<Message>(
      `${environment.apiBaseUrl}/conversations/${conversationId}/messages`,
      { body },
    );
  }
}
