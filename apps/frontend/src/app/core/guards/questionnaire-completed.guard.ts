import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UsersService } from '../users.service';

/**
 * Aplicado junto a `profileGuard` (en ese orden: `canActivate: [profileGuard,
 * questionnaireCompletedGuard]`) en `/settings`/`/chats`/`/chats/:id` — no en `/questionnaire` (ahí
 * es precisamente donde hay que poder entrar para completarlo por primera vez) ni en `/dashboard`
 * (ya se queda vacío con normalidad sin comparaciones, sin necesitar redirección propia).
 *
 * Sin esto, un usuario con perfil pero que todavía no completó nunca el cuestionario podía entrar a
 * configuración o al chat desde la cabecera (`minimalNav` solo la oculta en `/registration`, no en
 * `/questionnaire`) y quedarse ahí sin ninguna comparación posible (el chat nunca puede tener
 * conversaciones — la elegibilidad depende de `comparisons`, que no existen hasta completar el
 * cuestionario) o con "Editar tus respuestas" apuntando a un cuestionario que aún no existe
 * (`PATCH /users/me/questionnaire` en modo edición exige uno ya completado).
 *
 * Redirige a `/` en vez de a `/questionnaire` a pelo — reutiliza la misma decisión de
 * `mainRouteGuard` (que ya sabe resolver perfil/cuestionario/dashboard en orden) en vez de duplicar
 * esa lógica aquí; como `profileGuard` ya garantiza que hay perfil antes de que este guard se
 * ejecute, `mainRouteGuard` siempre aterrizará en `/questionnaire`, nunca en `/registration`.
 */
export const questionnaireCompletedGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const usersService = inject(UsersService);

  const profile = await firstValueFrom(usersService.getOwnProfile());
  if (!profile?.questionnaireCompletedAt) {
    return router.createUrlTree(['/']);
  }

  return true;
};
