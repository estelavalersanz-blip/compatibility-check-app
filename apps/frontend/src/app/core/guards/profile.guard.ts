import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { UsersService } from '../users.service';

/**
 * Aplicado a todas las rutas autenticadas salvo `features/registration` (tarea 11.6; spec
 * `user-registration`, "Sin perfil, cualquier ruta redirige a completar perfil paso 1"): sin fila de
 * perfil, redirige a `/registration` sin importar qué ruta se pidiera. Reutiliza
 * `UsersService.getOwnProfile()` (cacheado con `shareReplay`) — si `mainRouteGuard` ya la consultó en
 * esta misma navegación encadenada, esta llamada no repite la petición HTTP (tarea 11.6, "sin
 * duplicar la llamada por cada guard").
 */
export const profileGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const usersService = inject(UsersService);

  if (!(await auth.hasValidSession())) {
    return router.createUrlTree(['/auth/login']);
  }

  const profile = await firstValueFrom(usersService.getOwnProfile());
  if (!profile) {
    return router.createUrlTree(['/registration']);
  }

  return true;
};
