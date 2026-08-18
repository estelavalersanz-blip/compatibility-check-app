import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/**
 * Mínimo compartido entre registro paso 1 y "nueva contraseña" (reset) — no un valor distinto por
 * pantalla (ver `references/design-tokens.md` de la skill `ui-design-consistency`, "Mínimo 8
 * caracteres"). Factorizado tras el verify de la sección 12: `register.component.ts` y
 * `reset-password.component.ts` habían declarado la misma constante y el mismo validador de grupo
 * por separado.
 */
export const MIN_PASSWORD_LENGTH = 8;

export const passwordMinLengthValidator = Validators.minLength(MIN_PASSWORD_LENGTH);

/** Validador de grupo: exige que `password`/`passwordConfirm` coincidan. */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const passwordConfirm = group.get('passwordConfirm')?.value as string | undefined;
  return password && passwordConfirm && password !== passwordConfirm
    ? { passwordMismatch: true }
    : null;
}
