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
}
