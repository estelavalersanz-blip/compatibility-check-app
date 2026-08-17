import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { routes } from '../../app.routes';
import { AuthService } from '../../core/auth.service';
import { ChatService } from '../../core/chat.service';
import { fakeAuthService, fakeChatService, fakeUsersService } from '../../core/testing/fakes';
import { UsersService } from '../../core/users.service';
import { LandingComponent } from './landing.component';

function ownProfile(overrides: Partial<OwnUserProfile> = {}): OwnUserProfile {
  return {
    id: 'user-1',
    name: 'Ada',
    alias: 'ada',
    photoUrl: null,
    questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    needsRecalculation: false,
    qualityIds: [],
    ...overrides,
  };
}

async function navigateToRoot(hasValidSession: boolean, profile: OwnUserProfile | null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: fakeAuthService(hasValidSession) },
      { provide: UsersService, useValue: fakeUsersService(profile) },
      { provide: ChatService, useValue: fakeChatService() },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/');
  harness.detectChanges();
  return { harness, url: TestBed.inject(Router).url };
}

function fakeMatchMedia(matches: boolean): MediaQueryList {
  return {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  } as MediaQueryList;
}

describe('LandingComponent (tareas 11d.1/11d.2)', () => {
  it('sin sesión activa, la ruta principal muestra la landing (titular, subtítulo, un único botón)', async () => {
    const { harness, url } = await navigateToRoot(false, null);

    expect(url).toBe('/');
    const root = harness.fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toContain('encaja contigo');
    expect(root.querySelector('p')?.textContent).toContain('cuestionario de compatibilidad');
    expect(root.querySelectorAll('button').length).toBe(1);
  });

  it('con sesión pero sin perfil, no muestra la landing: resuelve igual que el test 11.3', async () => {
    expect((await navigateToRoot(true, null)).url).toBe('/registration');
  });

  it('con perfil sin cuestionario completado, no muestra la landing: resuelve al cuestionario', async () => {
    const profile = ownProfile({ questionnaireCompletedAt: null });
    expect((await navigateToRoot(true, profile)).url).toBe('/questionnaire');
  });

  it('con perfil y cuestionario completado, no muestra la landing: resuelve al dashboard', async () => {
    expect((await navigateToRoot(true, ownProfile())).url).toBe('/dashboard');
  });

  it('el botón de la landing navega a /auth/login', async () => {
    const { harness } = await navigateToRoot(false, null);
    const root = harness.fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('button');
    if (!button) {
      throw new Error('No se encontró el botón de la landing');
    }

    button.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/auth/login');
  });

  it('con prefers-reduced-motion: reduce simulado, el contenido es visible de inmediato', () => {
    spyOn(window, 'matchMedia').and.returnValue(fakeMatchMedia(true));

    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.reducedMotion()).toBe(true);
    const root = fixture.nativeElement as HTMLElement;
    // El contenido está en el DOM de inmediato — nunca oculto/gateado detrás de que termine una
    // animación (la propia clase `--reduced-motion` es lo que desactiva la animación en CSS).
    expect(root.querySelector('h1')?.textContent).toContain('encaja contigo');
    expect(root.querySelector('.landing-title--reduced-motion')).not.toBeNull();
    expect(root.querySelector('.landing-cta--reduced-motion')).not.toBeNull();
  });
});
