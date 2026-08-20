import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Requisitos de contraseña (endurecidos el 2026-08-20, a petición explícita de la usuaria): mínimo 8
 * caracteres, y al menos una mayúscula, una minúscula y un carácter especial. Compartido entre
 * registro paso 1, "nueva contraseña" (reset) y "cambiar contraseña" (configuración) — un único
 * validador, no uno distinto por pantalla (mismo criterio que ya regía para el mínimo de 8, ver el
 * historial de este fichero): endurecer la contraseña en la creación de la cuenta y dejar que
 * siguiera siendo más débil al cambiarla o recuperarla no tendría sentido.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Mismo texto en el hint siempre visible (`.form-text`) y en el mensaje de error
 *  (`.invalid-feedback`) de las 3 pantallas — una sola fuente para no desincronizarlas. */
export const PASSWORD_REQUIREMENTS_MESSAGE =
  'Mínimo 8 caracteres, con mayúscula, minúscula y un carácter especial.';

// `\p{Lu}`/`\p{Ll}` (mayúscula/minúscula Unicode), no `[A-Z]`/`[a-z]`: así una tilde/eñe en mayúscula
// (p. ej. "Ñ") cuenta como mayúscula igual que en cualquier idioma, no solo el alfabeto ASCII.
const HAS_UPPERCASE = /\p{Lu}/u;
const HAS_LOWERCASE = /\p{Ll}/u;
// "Carácter especial" = ni letra unicode ni dígito ni espacio — no una lista cerrada de símbolos
// concretos (`!@#$...`), para no dejar fuera algún símbolo válido no previsto ni, al mismo tiempo,
// contar una letra acentuada como si fuera "especial" (una eñe/tilde SÍ es una letra normal).
const HAS_SPECIAL_CHARACTER = /[^\p{L}\p{N}\s]/u;

/** Único error (`passwordStrength`), no uno distinto por regla incumplida: el mensaje visible ya
 *  enumera las 4 condiciones juntas (`PASSWORD_REQUIREMENTS_MESSAGE`), así que el modelo de errores
 *  no necesita distinguirlas una a una. */
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null) ?? '';
  const isValid =
    value.length >= MIN_PASSWORD_LENGTH &&
    HAS_UPPERCASE.test(value) &&
    HAS_LOWERCASE.test(value) &&
    HAS_SPECIAL_CHARACTER.test(value);
  return isValid ? null : { passwordStrength: true };
}

/** Validador de grupo: exige que `password`/`passwordConfirm` coincidan. */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const passwordConfirm = group.get('passwordConfirm')?.value as string | undefined;
  return password && passwordConfirm && password !== passwordConfirm
    ? { passwordMismatch: true }
    : null;
}
