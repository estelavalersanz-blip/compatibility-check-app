import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { UsersService } from '../users.service';

/**
 * Guard de la ruta principal (`/`) — resuelve a completar perfil / cuestionario / dashboard según el
 * estado del usuario autenticado, en ese orden de prioridad (spec `results-dashboard`, "Enrutamiento
 * de la página principal"; spec `user-registration`, "la comprobación de perfil tiene prioridad sobre
 * esta"). Sin sesión (tarea 11d.1, spec `authentication` "Landing pública..."), deja pasar (`true`)
 * para que se muestre `features/landing`, la propia `component` de la ruta `''` — no redirige.
 */
export const mainRouteGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const usersService = inject(UsersService);

  if (!(await auth.hasValidSession())) {
    return true;
  }

  const profile = await firstValueFrom(usersService.getOwnProfile());
  if (!profile) {
    return router.createUrlTree(['/registration']);
  }
  if (!profile.questionnaireCompletedAt) {
    return router.createUrlTree(['/questionnaire']);
  }
  return router.createUrlTree(['/dashboard']);
};
