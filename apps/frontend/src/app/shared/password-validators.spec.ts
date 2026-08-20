import { FormControl, FormGroup } from '@angular/forms';
import { passwordsMatchValidator, passwordStrengthValidator } from './password-validators';

/**
 * Requisitos endurecidos el 2026-08-20 a petición explícita de la usuaria: mínimo 8 caracteres +
 * mayúscula + minúscula + carácter especial. Test directo del validador (no solo indirecto vía los
 * 3 formularios que lo usan) — mismo criterio que `weighting.util.spec.ts` en el backend para
 * lógica compartida.
 */
describe('passwordStrengthValidator', () => {
  function errorsFor(value: string): Record<string, unknown> | null {
    return passwordStrengthValidator(new FormControl(value));
  }

  it('acepta una contraseña que cumple las 4 condiciones', () => {
    expect(errorsFor('Abcdefg1!')).toBeNull();
  });

  it('rechaza menos de 8 caracteres, aunque tenga mayúscula/minúscula/especial', () => {
    expect(errorsFor('Ab1!')).toEqual({ passwordStrength: true });
  });

  it('rechaza sin ninguna mayúscula', () => {
    expect(errorsFor('abcdefg1!')).toEqual({ passwordStrength: true });
  });

  it('rechaza sin ninguna minúscula', () => {
    expect(errorsFor('ABCDEFG1!')).toEqual({ passwordStrength: true });
  });

  it('rechaza sin ningún carácter especial', () => {
    expect(errorsFor('Abcdefg12')).toEqual({ passwordStrength: true });
  });

  it('rechaza una cadena vacía', () => {
    expect(errorsFor('')).toEqual({ passwordStrength: true });
  });

  it('una eñe/tilde en mayúscula cuenta como mayúscula (Unicode, no solo A-Z)', () => {
    // "Ñecesito1!" — la mayúscula es la Ñ, sin ninguna letra A-Z en mayúscula.
    expect(errorsFor('Ñecesito1!')).toBeNull();
  });

  it('una letra acentuada NO cuenta como carácter especial (es una letra, no un símbolo)', () => {
    // 8 caracteres, mayúscula y minúscula presentes, pero "ñ" es la única candidata a "especial" y
    // es una letra — sigue sin haber un símbolo de verdad.
    expect(errorsFor('Abcdefñg')).toEqual({ passwordStrength: true });
  });

  it('acepta símbolos variados como carácter especial, no solo unos pocos concretos', () => {
    for (const symbol of ['!', '@', '#', '$', '%', '^', '&', '*', '-', '_', '.', '?']) {
      expect(errorsFor(`Abcdefg1${symbol}`)).toBeNull();
    }
  });
});

describe('passwordsMatchValidator (sin cambios de comportamiento)', () => {
  function group(password: string, passwordConfirm: string): FormGroup {
    return new FormGroup({
      password: new FormControl(password),
      passwordConfirm: new FormControl(passwordConfirm),
    });
  }

  it('sin error cuando coinciden', () => {
    expect(passwordsMatchValidator(group('Abcdefg1!', 'Abcdefg1!'))).toBeNull();
  });

  it('con error cuando no coinciden', () => {
    expect(passwordsMatchValidator(group('Abcdefg1!', 'otraCosa'))).toEqual({ passwordMismatch: true });
  });
});
