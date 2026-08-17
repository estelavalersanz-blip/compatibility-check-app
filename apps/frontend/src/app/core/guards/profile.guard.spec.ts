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
    questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
    needsRecalculation: false,
    qualityIds: [],
    ...overrides,
  };
}

async function navigateTo(url: string, profile: OwnUserProfile | null): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: fakeAuthService(true) },
      { provide: UsersService, useValue: fakeUsersService(profile) },
      { provide: ChatService, useValue: fakeChatService() },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return TestBed.inject(Router).url;
}

describe('profileGuard (tareas 11.5/11.6)', () => {
  const protectedRoutes = ['/questionnaire', '/dashboard', '/settings', '/chats'];

  for (const path of protectedRoutes) {
    it(`sin perfil aún, navegar directamente a ${path} redirige a completar perfil`, async () => {
      expect(await navigateTo(path, null)).toBe('/registration');
    });

    it(`con perfil ya completado, navegar a ${path} no redirige`, async () => {
      expect(await navigateTo(path, ownProfile())).toBe(path);
    });
  }

  it('no aplica a /registration: sin perfil, esa ruta se puede visitar igualmente', async () => {
    expect(await navigateTo('/registration', null)).toBe('/registration');
  });
});
