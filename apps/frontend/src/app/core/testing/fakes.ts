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

export function fakeUsersService(
  profile: OwnUserProfile | null,
): Pick<UsersService, 'getOwnProfile' | 'invalidateOwnProfile'> {
  return {
    getOwnProfile: () => of(profile),
    invalidateOwnProfile: () => undefined,
  };
}
