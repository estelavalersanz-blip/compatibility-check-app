import { signal } from '@angular/core';
import { Conversation, Message, OwnUserProfile } from '@compatibility-check-app/shared-types';
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
 * `user.id`/`user.email` (sección 17b) — cualquier ruta protegida que se navegue vía `app.routes`
 * real puede acabar montando `ChatConversationComponent`, que lee `session()?.user.id` como campo de
 * instancia (se evalúa siempre al construir, no solo al enviar un formulario) — sin esto, un fake
 * sin `.user` lanza `TypeError` en cuanto se monta, igual que el gotcha ya documentado de
 * `checkAlias`/`fakeUsersService` de la sección 17.
 */
export function fakeAuthService(hasSession: boolean): FakeAuthService {
  const session = { access_token: 'jwt', user: { id: 'auth-user-fake', email: 'fake@example.com' } };
  const sessionSignal = signal(hasSession ? (session as never) : null);
  return {
    session: sessionSignal.asReadonly(),
    hasSession: () => sessionSignal() !== null,
    hasValidSession: () => Promise.resolve(hasSession),
    getAccessToken: () => (hasSession ? 'jwt' : null),
    signOut: () => Promise.resolve(),
  };
}

/** `getMessages`/`sendMessage` añadidos en la sección 17b — mismo motivo que `user.id` arriba:
 *  `ChatConversationComponent` puede acabar montado por cualquier test que navegue por `app.routes`
 *  real hasta `/chats/:id` con perfil y cuestionario ya completados. */
export function fakeChatService(
  conversations: Conversation[] = [],
): Pick<ChatService, 'listConversations' | 'getMessages' | 'sendMessage'> {
  return {
    listConversations: () => of(conversations),
    getMessages: () => of([]),
    sendMessage: (_conversationId: string, body: string) =>
      of({
        id: 'fake-message',
        conversationId: _conversationId,
        senderId: 'auth-user-fake',
        body,
        createdAt: new Date(0).toISOString(),
        readAt: null,
      } satisfies Message),
  };
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
