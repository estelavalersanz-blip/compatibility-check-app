import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { QualitiesService } from '../qualities.service';
import { fakeAuthService, fakeChatService } from '../testing/fakes';
import { UsersService } from '../users.service';

/**
 * Navega a `/registration` con `app.routes` real, igual que "Cabecera de Shell A en completar
 * perfil" de `registration.component.spec.ts` — sin guard de por medio (o dejando pasar), esta ruta
 * monta `ShellComponent` (pide `ChatService`/`UsersService.invalidateOwnProfile`) y
 * `RegistrationComponent` (pide `UsersService.checkAlias`/`createProfile` y `QualitiesService`) de
 * verdad, sin relación con lo que `sessionGuard` en sí comprueba.
 */
async function navigateToRegistration(hasValidSession: boolean): Promise<string> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      { provide: AuthService, useValue: fakeAuthService(hasValidSession) },
      { provide: ChatService, useValue: fakeChatService() },
      {
        provide: UsersService,
        useValue: {
          checkAlias: () => of({ available: true }),
          createProfile: () => of({}),
          invalidateOwnProfile: () => undefined,
        },
      },
      { provide: QualitiesService, useValue: { getAll: () => of([]) } },
    ],
  });

  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/registration');
  return TestBed.inject(Router).url;
}

/**
 * Bug encontrado en verificación (spec `authentication`): `/registration` era la única ruta
 * autenticada sin ningún `canActivate` — un visitante sin sesión podía cargar el formulario completo
 * de completar perfil. `profileGuard` no sirve aquí tal cual: su rama "sin perfil → `/registration`"
 * redirigiría a esta misma ruta, así que este guard solo repite la comprobación de sesión.
 */
describe('sessionGuard', () => {
  it('sin sesión válida, navegar a /registration redirige a /auth/login', async () => {
    expect(await navigateToRegistration(false)).toBe('/auth/login');
  });

  it('con sesión válida, navegar a /registration no redirige', async () => {
    expect(await navigateToRegistration(true)).toBe('/registration');
  });
});
