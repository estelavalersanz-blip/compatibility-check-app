import { signal } from '@angular/core';
import { Conversation, OwnUserProfile } from '@compatibility-check-app/shared-types';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { ChatService } from '../chat.service';
import { UsersService } from '../users.service';

type FakeAuthService = Pick<
  AuthService,
  'session' | 'hasSession' | 'hasValidSession' | 'getAccessToken' | 'signOut'
>;

/**
 * Fake compartido de `AuthService` para tests de guards/`core/shell` — nunca toca Supabase real.
 * `session` es un signal de verdad (no una función suelta): `ShellComponent` lo lee dentro de un
 * `computed()`, que exige un productor reactivo real, no cualquier función con la misma firma.
 */
export function fakeAuthService(hasSession: boolean): FakeAuthService {
  const sessionSignal = signal(hasSession ? ({ access_token: 'jwt' } as never) : null);
  return {
    session: sessionSignal.asReadonly(),
    hasSession: () => sessionSignal() !== null,
    hasValidSession: () => Promise.resolve(hasSession),
    getAccessToken: () => (hasSession ? 'jwt' : null),
    signOut: () => Promise.resolve(),
  };
}

export function fakeChatService(
  conversations: Conversation[] = [],
): Pick<ChatService, 'listConversations'> {
  return { listConversations: () => of(conversations) };
}

/**
 * `checkAlias`/`updateProfile` añadidos en la sección 17: cualquier ruta protegida que se navegue vía
 * `app.routes` real (p. ej. `profile.guard.spec.ts`, que recorre `/questionnaire`/`/dashboard`/
 * `/settings`/`/chats` con perfil ya completado) puede acabar montando de verdad
 * `features/settings`, y su formulario engancha `aliasAvailableValidator` sobre este mismo
 * `UsersService` en cuanto se hace `patchValue` — sin `checkAlias` aquí, esa validación asíncrona
 * lanza `TypeError` de verdad (visto en el navegador/CI: el error escapa fuera del ciclo síncrono de
 * creación del componente, vía el mismo mecanismo interno de señales que ejecuta los validadores
 * async, y descoloca al test runner en vez de fallar limpiamente el test que lo originó).
 */
export function fakeUsersService(
  profile: OwnUserProfile | null,
): Pick<UsersService, 'getOwnProfile' | 'invalidateOwnProfile' | 'checkAlias' | 'updateProfile'> {
  return {
    getOwnProfile: () => of(profile),
    invalidateOwnProfile: () => undefined,
    checkAlias: () => of({ available: true }),
    updateProfile: () => of(profile ?? (null as unknown as OwnUserProfile)),
  };
}
