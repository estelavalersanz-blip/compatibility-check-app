import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Conversation } from '@compatibility-check-app/shared-types';
import { Observable, catchError, filter, interval, of, switchMap } from 'rxjs';
import { BrandMarkComponent } from '../../shared/brand-mark/brand-mark.component';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { UsersService } from '../users.service';

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
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Tarea 11.1: los 3 botones solo se muestran con sesión activa. */
  readonly hasSession = computed(() => this.auth.session() !== null);

  /** Pedido explícito de la usuaria: ver en algún sitio de la app el correo con el que se ha
   *  iniciado sesión — usado como `title` nativo del botón de cerrar sesión (ver plantilla). El
   *  campo no editable de Configuración (`settings.component.ts`) es la fuente accesible en
   *  cualquier dispositivo; esto es solo un atajo adicional para quien pasa el ratón por encima. */
  readonly userEmail = computed(() => this.auth.session()?.user?.email ?? '');

  /**
   * Caso especial de completar perfil (SKILL.md, "Shell A"): sin icono de chat ni enlace de
   * Configuración, solo cerrar sesión. Se lee de `data.minimalNav` de la ruta hija activa más
   * profunda, y se recalcula en cada navegación completada.
   */
  readonly minimalNav = signal(this.readMinimalNavFromRoute());

  /** Tareas 11.2b/11.2c: indicador de no leídos, sondeado — nunca se muestra si `minimalNav()`.
   *  Suma de `unreadCount` de todas las conversaciones (no solo "hay alguno") — bug real reportado
   *  por la usuaria: el indicador anterior era un punto vacío sin número, además de
   *  `bg-secondary` (rojo) casi invisible contra el degradado naranja→rojo de la propia cabecera. */
  readonly unreadMessageCount = signal(0);

  /**
   * Tarea 21.1/21.2 (responsive) — bug real encontrado en la verificación manual de la tarea 21.7:
   * Bootstrap no carga su bundle JS en este proyecto (design.md decisión 3c-bis, para evitar
   * conflictos con la detección de cambios de Angular), así que `data-bs-toggle="collapse"` en la
   * plantilla no tiene ningún efecto por sí solo — Bootstrap solo aporta el CSS de `.collapse`/
   * `.collapse.show` (`display: none`/`block`), nunca el JS que añade esa clase al pulsar el
   * toggler. Sin esta señal, el menú hamburguesa era, en la práctica, imposible de abrir en móvil.
   */
  readonly navCollapsed = signal(true);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.minimalNav.set(this.readMinimalNavFromRoute());
        // Una navegación real cierra el menú móvil — si no, quedaría abierto tapando la siguiente
        // pantalla en viewport estrecho.
        this.navCollapsed.set(true);
      });

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
    this.unreadMessageCount.set(
      conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    );
  }

  /** Ver el comentario de `navCollapsed` — el toggle real que Bootstrap dejaría de hacer solo. */
  toggleNav(): void {
    this.navCollapsed.update((collapsed) => !collapsed);
  }

  private readMinimalNavFromRoute(): boolean {
    let node = this.route.snapshot.firstChild;
    while (node?.firstChild) {
      node = node.firstChild;
    }
    return Boolean(node?.data['minimalNav']);
  }

  /**
   * `invalidateOwnProfile()` antes de navegar (tarea 20.2, bug real): `logout()` nunca recarga la
   * página (navegación dentro de la SPA), así que la caché de `UsersService.getOwnProfile()`
   * (pensada para durar toda la sesión de navegación, no toda la vida de la app) sobreviviría al
   * cierre de sesión y se filtraría al siguiente usuario que inicie sesión en la misma pestaña —
   * viendo el guard de ruta principal si "hay perfil" según el usuario ANTERIOR, no el actual.
   */
  async logout(): Promise<void> {
    await this.auth.signOut();
    this.usersService.invalidateOwnProfile();
    await this.router.navigate(['/auth/login']);
  }
}
