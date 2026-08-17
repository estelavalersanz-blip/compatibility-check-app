import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Conversation } from '@compatibility-check-app/shared-types';
import { Observable, catchError, filter, interval, of, switchMap } from 'rxjs';
import { BrandMarkComponent } from '../../shared/brand-mark/brand-mark.component';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';

/** Sondeo del contador de no leídos (tarea 11.2c) — dentro del rango de 20-30s pedido. */
const UNREAD_POLL_INTERVAL_MS = 25_000;

/**
 * Cabecera compartida de la aplicación autenticada (Shell A — ui-design-consistency SKILL.md).
 * Envuelve el `<router-outlet>` de las rutas hijas: cada pantalla de Shell A inyecta su contenido
 * ahí, sin volver a envolverlo en su propio `container`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterOutlet, BrandMarkComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Tarea 11.1: los 3 botones solo se muestran con sesión activa. */
  readonly hasSession = computed(() => this.auth.session() !== null);

  /**
   * Caso especial de completar perfil (SKILL.md, "Shell A"): sin icono de chat ni enlace de
   * Configuración, solo cerrar sesión. Se lee de `data.minimalNav` de la ruta hija activa más
   * profunda, y se recalcula en cada navegación completada.
   */
  readonly minimalNav = signal(this.readMinimalNavFromRoute());

  /** Tareas 11.2b/11.2c: indicador de no leídos, sondeado — nunca se muestra si `minimalNav()`. */
  readonly hasUnreadMessages = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.minimalNav.set(this.readMinimalNavFromRoute()));

    // Primera carga inmediata y síncrona (sin pasar por ningún temporizador, ni siquiera de 0ms) —
    // separada del sondeo periódico para que el estado inicial no dependa de que se cumpla un
    // `setTimeout`, por corto que sea.
    this.fetchUnread().subscribe((conversations) => this.applyUnread(conversations));

    // Sondeo periódico (tarea 11.2c) — dentro del rango de 20-30s pedido. `catchError` por tick, no
    // en el stream completo: un fallo puntual (red, 401) no debe dejar de sondear para siempre.
    interval(UNREAD_POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.fetchUnread()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((conversations) => this.applyUnread(conversations));
  }

  private fetchUnread(): Observable<Conversation[]> {
    return this.chatService.listConversations().pipe(catchError(() => of([])));
  }

  private applyUnread(conversations: Conversation[]): void {
    this.hasUnreadMessages.set(conversations.some((conversation) => conversation.unreadCount > 0));
  }

  private readMinimalNavFromRoute(): boolean {
    let node = this.route.snapshot.firstChild;
    while (node?.firstChild) {
      node = node.firstChild;
    }
    return Boolean(node?.data['minimalNav']);
  }

  async logout(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/auth/login']);
  }
}
