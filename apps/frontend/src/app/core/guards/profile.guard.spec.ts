import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { ComparisonsService } from '../comparisons.service';
import { MatchingService } from '../matching.service';
import { QualitiesService } from '../qualities.service';
import { QuestionnaireService } from '../questionnaire.service';
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

// `hasValidSession` con valor por defecto `true`: todos los tests de abajo ya asumían sesión válida
// y solo variaban el perfil — el tercer parámetro opcional evita tocar esas llamadas existentes al
// añadir el caso "sin sesión válida" (hueco encontrado en verificación, spec `authentication`).
async function navigateTo(
  url: string,
  profile: OwnUserProfile | null,
  hasValidSession = true,
): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: fakeAuthService(hasValidSession) },
      { provide: UsersService, useValue: fakeUsersService(profile) },
      { provide: ChatService, useValue: fakeChatService() },
      // Este test navega de verdad por `app.routes` con perfil ya completado, así que puede acabar
      // montando cualquiera de los componentes reales de las 4 rutas protegidas
      // (`QuestionnaireComponent`/`ResultsDashboardComponent`/`SettingsComponent`) — cada uno
      // necesita estos servicios en su constructor, sin relación con lo que este guard en sí
      // comprueba.
      { provide: QuestionnaireService, useValue: { getAnswers: () => of([]) } },
      { provide: ComparisonsService, useValue: { findMine: () => of([]) } },
      { provide: QualitiesService, useValue: { getAll: () => of([]) } },
      { provide: MatchingService, useValue: { recalculate: () => of({}) } },
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

  // Hueco encontrado en verificación (spec `authentication`): ningún test de arriba ejercitaba la
  // rama "sin sesión válida" (líneas 20-22 de `profileGuard`) — todos usaban sesión válida y solo
  // variaban el perfil. Con sesión inválida el guard corta antes de consultar el perfil, así que el
  // perfil pasado aquí es indiferente (se usa `null`).
  it('sin sesión válida, navegar a /questionnaire redirige a /auth/login', async () => {
    expect(await navigateTo('/questionnaire', null, false)).toBe('/auth/login');
  });
});
