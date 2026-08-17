import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';
import { UsersService } from '../core/users.service';

/**
 * Validación en vivo de alias contra `GET /users/check-alias` (tarea 13.2; reutilizable por
 * `features/settings` en la sección 17, que aplica "las mismas reglas... de alias" — factorizado
 * desde el principio para no duplicarlo, mismo criterio que `shared/password-validators.ts` tras el
 * verify de la sección 12). Un fallo de red no bloquea el formulario de forma permanente: se trata
 * como "disponible" — el backend sigue siendo la validación real al enviar, nunca solo esta.
 */
export function aliasAvailableValidator(usersService: UsersService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const alias = (control.value as string | null)?.trim();
    if (!alias) {
      return of(null);
    }

    return usersService.checkAlias(alias).pipe(
      map(({ available }) => (available ? null : { aliasTaken: true })),
      catchError(() => of(null)),
    );
  };
}
