import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Message } from '@compatibility-check-app/shared-types';
import { interval } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';

/** Sondeo mientras la conversación está abierta (tarea 17b.5/17b.6) — más frecuente que el de
 *  no leídos de `core/shell` (20-30s) y que el de `features/processing` (3s): aquí hay una
 *  conversación activa, no un contador de fondo ni una espera de análisis. */
const POLL_INTERVAL_MS = 4000;

interface ParticipantView {
  alias: string;
  photoUrl: string | null;
}

/**
 * Conversación de chat (sección 17b; spec `internal-chat`). "Caso especial" ya documentado en
 * `page-template.md`: el `card-body` es la lista de mensajes con scroll propio, el `card-footer` es
 * el único formulario real de la pantalla.
 */
@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './chat-conversation.component.html',
  styleUrl: './chat-conversation.component.scss',
})
export class ChatConversationComponent {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly scrollAnchor = viewChild<ElementRef<HTMLElement>>('scrollAnchor');

  /** Snapshot tomado una vez al montar — igual criterio que `mode` en `QuestionnaireComponent`
   *  (`route.snapshot`, no un `Observable` de parámetros: esta pantalla no se reutiliza navegando
   *  de una conversación a otra sin recrear el componente). */
  private readonly conversationId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly myUserId = this.authService.session()?.user?.id ?? null;

  readonly loading = signal(true);
  readonly messages = signal<Message[]>([]);
  readonly otherParticipant = signal<ParticipantView | null>(null);
  readonly draftMessage = signal('');
  readonly sendError = signal<string | null>(null);

  /** Cursor del sondeo (tarea 17b.5) — el `createdAt` del último mensaje ya recibido, nunca un
   *  signal: no lo lee ninguna plantilla, es solo estado interno entre sondeos. */
  private lastMessageAt: string | null = null;

  constructor() {
    // Primera carga con suscripción directa, nunca envuelta en un timer/interval (gotcha zoneless ya
    // conocido, ver core/shell/shell.component.ts) — el sondeo periódico va aparte, más abajo.
    this.chatService.listConversations().subscribe({
      next: (list) => {
        const conversation = list.find((candidate) => candidate.id === this.conversationId);
        if (conversation) {
          this.otherParticipant.set({
            alias: conversation.otherParticipant.alias,
            photoUrl: conversation.otherParticipant.photoUrl,
          });
        }
      },
    });

    this.chatService.getMessages(this.conversationId).subscribe({
      next: (list) => {
        this.applyMessages(list, { replace: true });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // Se detiene solo al salir de la pantalla (`takeUntilDestroyed`) — sin test propio de Karma para
    // el disparo periódico en sí (mismo criterio ya aplicado en `features/processing`: RxJS
    // `interval`/`takeUntilDestroyed` son primitivas ya probadas, lo que sí se testea es la lógica de
    // fusión de mensajes nuevos, `applyMessages`, de forma directa vía el flujo de envío).
    interval(POLL_INTERVAL_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.poll());
  }

  isMine(message: Message): boolean {
    return message.senderId === this.myUserId;
  }

  onDraftInput(event: Event): void {
    this.draftMessage.set((event.target as HTMLInputElement).value);
  }

  send(): void {
    const body = this.draftMessage().trim();
    if (!body) {
      return;
    }
    this.sendError.set(null);
    this.chatService.sendMessage(this.conversationId, body).subscribe({
      next: (message) => {
        this.applyMessages([message], { replace: false });
        this.draftMessage.set('');
      },
      error: () => this.sendError.set('No se pudo enviar el mensaje. Inténtalo de nuevo.'),
    });
  }

  private poll(): void {
    this.chatService.getMessages(this.conversationId, this.lastMessageAt ?? undefined).subscribe({
      next: (newMessages) => this.applyMessages(newMessages, { replace: false }),
    });
  }

  /** Punto único para incorporar mensajes, tanto en la carga inicial (`replace: true`) como en cada
   *  sondeo o envío propio (`replace: false`, se añaden al final sin recargar toda la conversación —
   *  tarea 17b.5). Con una lista vacía (sondeo sin novedades) no hace nada, ni siquiera recalcular el
   *  scroll. */
  private applyMessages(newMessages: Message[], options: { replace: boolean }): void {
    if (newMessages.length === 0) {
      return;
    }
    this.messages.update((current) => (options.replace ? newMessages : [...current, ...newMessages]));
    this.lastMessageAt = newMessages[newMessages.length - 1].createdAt;
    this.scheduleScrollToBottom();
  }

  /** `afterNextRender`, no un `setTimeout`/microtask a mano: es la vía correcta de Angular para leer/
   *  escribir el DOM justo después de que la vista refleje el cambio de `messages()`, funciona igual
   *  en zoneless. Se llama con el `Injector` explícito porque `applyMessages` se invoca desde dentro
   *  de un `subscribe()`, fuera del contexto de inyección síncrono del constructor. */
  private scheduleScrollToBottom(): void {
    afterNextRender(
      () => {
        const element = this.scrollAnchor()?.nativeElement;
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      },
      { injector: this.injector },
    );
  }
}
