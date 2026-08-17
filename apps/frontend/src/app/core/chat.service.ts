import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Conversation } from '@compatibility-check-app/shared-types';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * `GET /conversations` (internal-chat spec). Vive en `core/` porque el propio `core/shell` lo
 * necesita para el indicador de no leídos (tarea 11.2c) antes de que exista `features/chats`
 * (sección 17b, que reutilizará este mismo servicio para el listado real en vez de duplicarlo).
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
}
