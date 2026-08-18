import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Conversation } from '@compatibility-check-app/shared-types';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { fakeAuthService, fakeChatService } from '../testing/fakes';
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
          ],
        },
        { path: 'chats', component: BlankChildComponent },
        { path: 'settings', component: BlankChildComponent },
        { path: 'auth/login', component: BlankChildComponent },
      ]),
      { provide: AuthService, useValue: { ...fakeAuthService(hasSession), signOut: signOutSpy } },
      { provide: ChatService, useValue: fakeChatService(options.conversations ?? []) },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/shell');
  await harness.fixture.whenStable();
  harness.detectChanges();

  return { harness, signOutSpy };
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
