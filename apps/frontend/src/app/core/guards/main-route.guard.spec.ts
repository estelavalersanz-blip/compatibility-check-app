import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { routes } from '../../app.routes';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { fakeAuthService, fakeChatService, fakeUsersService } from '../testing/fakes';
import { UsersService } from '../users.service';

function ownProfile(overrides: Partial<OwnUserProfile> = {}): OwnUserProfile {
  return {
    id: 'user-1',
    name: 'Ada',
    alias: 'ada',
    photoUrl: null,
    questionnaireCompletedAt: null,
    needsRecalculation: false,
    qualityIds: [],
    ...overrides,
  };
}

async function navigateToRoot(hasValidSession: boolean, profile: OwnUserProfile | null): Promise<string> {
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
  return TestBed.inject(Router).url;
}

// El caso "sin sesión activa" (deja pasar, se muestra la landing) es la tarea 11d.1 — probado en
// `features/landing/landing.component.spec.ts`, no aquí.
describe('mainRouteGuard (tareas 11.3/11.4)', () => {
  it('con sesión pero sin fila de perfil, redirige a completar perfil', async () => {
    expect(await navigateToRoot(true, null)).toBe('/registration');
  });

  it('con perfil pero sin cuestionario completado nunca, redirige al cuestionario', async () => {
    const profile = ownProfile({ questionnaireCompletedAt: null });
    expect(await navigateToRoot(true, profile)).toBe('/questionnaire');
  });

  it('con perfil y cuestionario ya completado, redirige al dashboard', async () => {
    const profile = ownProfile({ questionnaireCompletedAt: '2024-01-01T00:00:00.000Z' });
    expect(await navigateToRoot(true, profile)).toBe('/dashboard');
  });
});
