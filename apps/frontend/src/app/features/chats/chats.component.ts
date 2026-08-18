import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Conversation } from '@compatibility-check-app/shared-types';
import { ChatService } from '../../core/chat.service';

/**
 * Listado de conversaciones (sección 17b; spec `internal-chat`, "Acceso a todas las conversaciones
 * propias desde el menú"). El backend ya las devuelve ordenadas por actividad más reciente
 * (`ChatService.listConversations`) — este componente NO reordena: a diferencia de
 * `results-dashboard` (que sí ordena en cliente), aquí no hay ningún campo propio de `Conversation`
 * con el que poder reproducir ese orden en cliente si `lastMessage` es `null` (conversación sin
 * mensajes todavía), así que la fuente de verdad del orden es el backend.
 */
@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './chats.component.html',
  styleUrl: './chats.component.scss',
})
export class ChatsComponent {
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly conversations = signal<Conversation[]>([]);

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver core/shell/shell.component.ts) — este listado no sondea (a diferencia de
    // features/chats/:id, tarea 17b.5): se refresca solo al volver a entrar a la pantalla.
    this.chatService.listConversations().subscribe({
      next: (list) => {
        this.conversations.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openConversation(conversationId: string): void {
    void this.router.navigate(['/chats', conversationId]);
  }
}
