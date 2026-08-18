import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Conversation } from '@compatibility-check-app/shared-types';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { UsersService } from '../users.service';
import { fakeAuthService, fakeChatService, fakeUsersService } from '../testing/fakes';
import { ShellComponent } from './shell.component';

@Component({ standalone: true, template: 'contenido de la pantalla' })
class BlankChildComponent {}

function fakeConversation(unreadCount: number): Conversation {
  return {
    id: 'conv-1',
    otherParticipant: {
      id: 'u2',
      name: 'Bea',
      alias: 'bea',
      photoUrl: null,
      questionnaireCompletedAt: null,
    },
    lastMessage: null,
    unreadCount,
  };
}

async function setup(
  hasSession: boolean,
  options: { minimalNav?: boolean; conversations?: Conversation[] } = {},
) {
  const signOutSpy = jasmine.createSpy('signOut').and.resolveTo(undefined);
  const invalidateOwnProfileSpy = jasmine.createSpy('invalidateOwnProfile');

  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: 'shell',
          component: ShellComponent,
          children: [
            {
              path: '',
              component: BlankChildComponent,
              data: { minimalNav: options.minimalNav ?? false },
            },
            // Segunda ruta hija (real: `settings`/`chats`/etc. son hijas de Shell A, nunca rutas
            // sueltas — ver `app.routes.ts`) solo para poder navegar DENTRO del mismo shell montado
            // y comprobar que eso cierra el menú móvil (tarea 21.1/21.2), sin desmontar `ShellComponent`
            // como pasaría navegando a una de las rutas de nivel superior de abajo.
            { path: 'other', component: BlankChildComponent },
          ],
        },
        { path: 'chats', component: BlankChildComponent },
        { path: 'settings', component: BlankChildComponent },
        { path: 'auth/login', component: BlankChildComponent },
      ]),
      { provide: AuthService, useValue: { ...fakeAuthService(hasSession), signOut: signOutSpy } },
      { provide: ChatService, useValue: fakeChatService(options.conversations ?? []) },
      {
        provide: UsersService,
        useValue: { ...fakeUsersService(null), invalidateOwnProfile: invalidateOwnProfileSpy },
      },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/shell');
  await harness.fixture.whenStable();
  harness.detectChanges();

  return { harness, signOutSpy, invalidateOwnProfileSpy };
}

type Harness = Awaited<ReturnType<typeof setup>>['harness'];

/** `ComponentFixture.nativeElement` está tipado como `any` — este cast centraliza el único `as` que
 *  hace falta para poder usar `querySelector(All)` con seguridad de tipos en el resto del fichero. */
function rootElement(harness: Harness): HTMLElement {
  return harness.fixture.nativeElement as HTMLElement;
}

function navItems(harness: Harness): HTMLElement[] {
  return Array.from(rootElement(harness).querySelectorAll<HTMLElement>('.navbar-nav .nav-item'));
}

describe('ShellComponent (tareas 11.1/11.2, 11.2b/11.2c)', () => {
  it('con sesión activa, muestra los 3 botones en orden: chat, configuración, cerrar sesión', async () => {
    const { harness } = await setup(true);
    const items = navItems(harness);

    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('Chats');
    expect(items[1].textContent).toContain('Configuración');
    expect(items[2].textContent).toContain('Cerrar sesión');
  });

  it('sin sesión activa, no muestra ninguno de los 3 botones', async () => {
    const { harness } = await setup(false);
    expect(navItems(harness).length).toBe(0);
  });

  it('la cabecera usa navbar-expand-md y el toggler móvil abre el mismo colapsable que aloja los 3 botones (tarea 21.1)', async () => {
    const { harness } = await setup(true);
    const root = rootElement(harness);
    const nav = root.querySelector('nav');
    const toggler = root.querySelector<HTMLButtonElement>('.navbar-toggler');
    const collapse = root.querySelector<HTMLElement>('.navbar-collapse');

    // navbar-expand-md es lo que hace que la cabecera colapse a menú hamburguesa por debajo de
    // 768px (SKILL.md, Shell A) — depende de una media query real del viewport de la ventana, así
    // que aquí se comprueba por estructura, no forzando un ancho (eso no engañaría a `@media`).
    expect(nav?.classList.contains('navbar-expand-md')).toBe(true);
    expect(toggler).not.toBeNull();
    expect(collapse).not.toBeNull();
    // El toggler apunta exactamente al colapsable que envuelve los 3 botones — mismo id, no uno
    // suelto sin relación real entre ambos.
    expect(toggler?.getAttribute('data-bs-target')).toBe(`#${collapse?.id}`);
    expect(toggler?.getAttribute('aria-controls')).toBe(collapse?.id);
    // El orden ya lo cubre el test anterior; aquí solo confirmamos que esos mismos 3 botones viven
    // dentro del colapsable móvil, no fuera de él.
    const items = navItems(harness);
    expect(items.length).toBe(3);
    expect(items.every((item) => collapse?.contains(item))).toBe(true);
  });

  /**
   * Bug real encontrado en la verificación manual de la tarea 21.7: Bootstrap no carga su bundle JS
   * en este proyecto (design.md decisión 3c-bis — evita conflictos con la detección de cambios de
   * Angular), así que `data-bs-toggle="collapse"` no tiene ningún efecto por sí solo — comprobado
   * real en el navegador: `.navbar-collapse` seguía en `display: none` después de pulsar el
   * toggler. El menú hamburguesa era, en la práctica, imposible de abrir en móvil.
   */
  it('el toggler abre y cierra el colapsable (Bootstrap no trae JS propio, hay que hacerlo en Angular), y una navegación real lo vuelve a cerrar (tarea 21.1/21.2)', async () => {
    const { harness } = await setup(true);
    const root = rootElement(harness);
    const toggler = root.querySelector<HTMLButtonElement>('.navbar-toggler');
    const collapse = () => root.querySelector<HTMLElement>('.navbar-collapse');

    expect(collapse()?.classList.contains('show')).toBe(false);
    expect(toggler?.getAttribute('aria-expanded')).toBe('false');

    toggler?.click();
    harness.detectChanges();
    expect(collapse()?.classList.contains('show')).toBe(true);
    expect(toggler?.getAttribute('aria-expanded')).toBe('true');

    // Navegar a otra pantalla de Shell A (p. ej. Configuración) cierra el menú — si no, quedaría
    // abierto tapando la pantalla siguiente en móvil. `ShellComponent` sigue montado (solo cambia su
    // ruta hija), igual que en la app real.
    await harness.navigateByUrl('/shell/other');
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(collapse()?.classList.contains('show')).toBe(false);
  });

  it('en modo completar perfil (minimalNav), oculta chat y configuración pero mantiene cerrar sesión', async () => {
    const { harness } = await setup(true, { minimalNav: true });
    const items = navItems(harness);

    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Cerrar sesión');
  });

  it('cerrar sesión limpia la sesión y redirige a la pantalla de autenticación', async () => {
    const { harness, signOutSpy } = await setup(true);
    const logoutButton = Array.from(
      rootElement(harness).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Cerrar sesión'));
    if (!logoutButton) {
      throw new Error('No se encontró el botón de cerrar sesión');
    }

    logoutButton.click();
    await harness.fixture.whenStable();

    expect(signOutSpy).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  /**
   * Bug real encontrado en producción durante la tarea 20.2 (verificación end-to-end): tras cerrar
   * sesión, `logout()` navega dentro de la SPA (`router.navigate`), sin recargar la página — así que
   * la instancia de `UsersService` (`providedIn: 'root'`, un único singleton para toda la vida de la
   * app) sobrevive. Su caché `getOwnProfile()` (`shareReplay(1)`, pensada para durar la sesión de
   * navegación) nunca se invalidaba al cerrar sesión, así que si un segundo usuario iniciaba sesión
   * en la misma pestaña sin recargar, los guards de ruta seguían viendo el perfil cacheado del
   * usuario anterior — verificado real contra el proyecto real de Supabase: la cuenta de
   * demostración (sin fila de perfil) llegó a `/dashboard` en vez de a completar perfil, porque la
   * sesión anterior (un usuario con perfil completo) había dejado la caché en `true`.
   */
  it('cerrar sesión invalida el caché de perfil de UsersService, para que el siguiente inicio de sesión en la misma pestaña no herede el del usuario anterior', async () => {
    const { harness, invalidateOwnProfileSpy } = await setup(true);
    const logoutButton = Array.from(
      rootElement(harness).querySelectorAll<HTMLButtonElement>('button'),
    ).find((button) => button.textContent?.includes('Cerrar sesión'));
    if (!logoutButton) {
      throw new Error('No se encontró el botón de cerrar sesión');
    }

    logoutButton.click();
    await harness.fixture.whenStable();

    expect(invalidateOwnProfileSpy).toHaveBeenCalled();
  });

  it('con al menos un mensaje sin leer, el icono de chat muestra el indicador', async () => {
    const { harness } = await setup(true, { conversations: [fakeConversation(2)] });
    const badge = rootElement(harness).querySelector('.bg-secondary.rounded-circle');
    expect(badge).not.toBeNull();
  });

  it('sin mensajes sin leer en ninguna conversación, no muestra el indicador', async () => {
    const { harness } = await setup(true, {
      conversations: [fakeConversation(0), fakeConversation(0)],
    });
    const badge = rootElement(harness).querySelector('.bg-secondary.rounded-circle');
    expect(badge).toBeNull();
  });

  it('sin ninguna conversación, tampoco muestra el indicador', async () => {
    const { harness } = await setup(true, { conversations: [] });
    const badge = rootElement(harness).querySelector('.bg-secondary.rounded-circle');
    expect(badge).toBeNull();
  });
});
