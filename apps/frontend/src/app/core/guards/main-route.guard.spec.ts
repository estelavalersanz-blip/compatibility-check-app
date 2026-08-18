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
import { QuestionnaireService } from '../questionnaire.service';
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
      // `/` puede resolver a `QuestionnaireComponent`/`ResultsDashboardComponent` reales (ver
      // `profile.guard.spec.ts` para el mismo criterio) — sus constructores necesitan estos
      // servicios, sin relación con lo que este guard en sí comprueba.
      { provide: QuestionnaireService, useValue: { getAnswers: () => of([]) } },
      { provide: ComparisonsService, useValue: { findMine: () => of([]) } },
      { provide: MatchingService, useValue: { recalculate: () => of({}) } },
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

  // El guard solo debe mirar perfil/cuestionario (ver comentario del propio guard) — nunca
  // `needsRecalculation` ni el estado de las comparaciones, aunque haya recálculo pendiente (spec
  // `results-dashboard`: dashboard "independientemente de si tiene comparaciones pendientes de
  // análisis o de recálculo"). Sin este test, un guard mal escrito que añadiera por error esa
  // condición seguiría en verde. `ComparisonsService` aquí sigue fijo a `of([])` (no hay fake
  // parametrizable como `fakeUsersService`, solo el inline de `navigateToRoot`), así que solo se
  // varía `needsRecalculation`.
  it('con perfil, cuestionario completado y needsRecalculation en true, redirige al dashboard igual', async () => {
    const profile = ownProfile({
      questionnaireCompletedAt: '2024-01-01T00:00:00.000Z',
      needsRecalculation: true,
    });
    expect(await navigateToRoot(true, profile)).toBe('/dashboard');
  });
});
