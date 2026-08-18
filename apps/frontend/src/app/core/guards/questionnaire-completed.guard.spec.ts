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
    questionnaireCompletedAt: null,
    needsRecalculation: false,
    qualityIds: [],
    ...overrides,
  };
}

async function navigateTo(url: string, profile: OwnUserProfile): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: fakeAuthService(true) },
      { provide: UsersService, useValue: fakeUsersService(profile) },
      { provide: ChatService, useValue: fakeChatService() },
      // Redirige a `/`, que `mainRouteGuard` resuelve montando `QuestionnaireComponent` de verdad.
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

describe('questionnaireCompletedGuard', () => {
  const guardedRoutes = ['/settings', '/chats', '/chats/conv-1'];

  for (const path of guardedRoutes) {
    it(`sin cuestionario completado, navegar a ${path} redirige (vía "/") al cuestionario`, async () => {
      expect(await navigateTo(path, ownProfile({ questionnaireCompletedAt: null }))).toBe(
        '/questionnaire',
      );
    });

    it(`con cuestionario ya completado, navegar a ${path} no redirige`, async () => {
      const profile = ownProfile({ questionnaireCompletedAt: '2024-01-01T00:00:00.000Z' });
      expect(await navigateTo(path, profile)).toBe(path);
    });
  }

  it('no aplica a /questionnaire: sin cuestionario completado, esa ruta se puede visitar igualmente', async () => {
    expect(await navigateTo('/questionnaire', ownProfile({ questionnaireCompletedAt: null }))).toBe(
      '/questionnaire',
    );
  });

  it('no aplica a /dashboard: sin cuestionario completado, esa ruta se puede visitar igualmente (queda vacía, sin redirigir)', async () => {
    expect(await navigateTo('/dashboard', ownProfile({ questionnaireCompletedAt: null }))).toBe(
      '/dashboard',
    );
  });
});
