import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';

/**
 * Bug encontrado en verificación (spec `authentication`): `registration` se había quedado como la
 * única ruta autenticada sin ningún `canActivate` — un visitante sin sesión podía cargar el
 * formulario completo de completar perfil. No puede reutilizar `profileGuard` tal cual: su segunda
 * comprobación ("sin perfil → redirige a `/registration`") crearía aquí un redirect a sí misma,
 * porque un usuario sin perfil DEBE poder ver `/registration` — es precisamente adonde aterriza. Este
 * guard repite solo la primera mitad de `profileGuard` (comprobar sesión), sin la comprobación de
 * perfil que causaría el bucle.
 */
export const sessionGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (!(await auth.hasValidSession())) {
    return router.createUrlTree(['/auth/login']);
  }

  return true;
};
