import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ResetPasswordComponent } from './reset-password.component';

function setInputValue(
  fixture: ComponentFixture<ResetPasswordComponent>,
  id: string,
  value: string,
): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`No se encontró el input #${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(fixture: ComponentFixture<ResetPasswordComponent>): void {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  form?.dispatchEvent(new Event('submit'));
}

/**
 * Sin tarea de test propia en `tasks.md` (12.7 no tiene un "12.7-test" emparejado, a diferencia de
 * 12.1/12.3/12.5) — se añade igualmente por consistencia con el resto de `features/auth`, mismo
 * nivel de cobertura que `register` (misma validación de contraseña + confirmación).
 */
describe('ResetPasswordComponent (tarea 12.7, sin test propio en tasks.md)', () => {
  let updateSpy: jasmine.Spy;
  let fixture: ComponentFixture<ResetPasswordComponent>;

  beforeEach(() => {
    updateSpy = jasmine.createSpy('updatePassword');
    TestBed.configureTestingModule({
      imports: [ResetPasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { updatePassword: updateSpy } }],
    });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
  });

  it('rechaza contraseñas que no coinciden, sin llamar al servicio', () => {
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'otraDistinta1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(updateSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#passwordConfirm')?.classList.contains('is-invalid')).toBe(true);
  });

  /**
   * Requisitos endurecidos el 2026-08-20 a petición explícita de la usuaria: además del mínimo de 8
   * caracteres, hace falta mayúscula, minúscula y carácter especial — mismo validador compartido que
   * `register.component.spec.ts` (ver `password-validators.spec.ts` para el detalle de cada regla).
   */
  it('rechaza una contraseña con longitud suficiente pero sin mayúscula ni carácter especial', () => {
    setInputValue(fixture, 'password', 'todaminuscula1');
    setInputValue(fixture, 'passwordConfirm', 'todaminuscula1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(updateSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#password')?.classList.contains('is-invalid')).toBe(true);
  });

  /**
   * Mismo bug real que en `register.component.spec.ts` — mismo mensaje ("Mínimo 8 caracteres"),
   * mismo fondo degradado de Shell B, mismo fix (`.auth-shell .invalid-feedback` en blanco, ver
   * `styles.scss`).
   */
  it('el mensaje de "Mínimo 8 caracteres" es blanco, no el rojo por defecto (bug real: casi ilegible sobre el degradado)', () => {
    setInputValue(fixture, 'password', 'corta1');
    setInputValue(fixture, 'passwordConfirm', 'corta1');

    submitForm(fixture);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const feedback = Array.from(root.querySelectorAll<HTMLElement>('.invalid-feedback')).find((el) =>
      el.textContent?.includes('Mínimo 8 caracteres'),
    );
    if (!feedback) {
      throw new Error('No se encontró el mensaje de "Mínimo 8 caracteres"');
    }
    expect(getComputedStyle(feedback).color).toBe('rgb(255, 255, 255)');
  });

  it('con contraseñas válidas y coincidentes, actualiza la contraseña y navega a la ruta principal', async () => {
    updateSpy.and.resolveTo(undefined);
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    await fixture.whenStable();

    expect(updateSpy).toHaveBeenCalledWith('ContraseñaLarga1!');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('muestra un mensaje especifico si la nueva contraseña es igual a la actual', async () => {
    // Reproducido en vivo contra producción: PUT /auth/v1/user devolvía 422, code 'same_password'
    // (confirmado en la consola del navegador) — con el mensaje generico anterior no habia forma de
    // saber que bastaba con elegir una contraseña distinta.
    updateSpy.and.rejectWith({
      __isAuthError: true,
      name: 'AuthApiError',
      message: 'New password should be different from the old password.',
      status: 422,
      code: 'same_password',
    });
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.alert-danger')?.textContent).toContain('diferente a la actual');
  });
});
