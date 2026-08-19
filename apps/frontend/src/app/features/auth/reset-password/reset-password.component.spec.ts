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
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'otraDistinta1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(updateSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#passwordConfirm')?.classList.contains('is-invalid')).toBe(true);
  });

  it('con contraseñas válidas y coincidentes, actualiza la contraseña y navega a la ruta principal', async () => {
    updateSpy.and.resolveTo(undefined);
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    await fixture.whenStable();

    expect(updateSpy).toHaveBeenCalledWith('contraseñaLarga1');
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
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.alert-danger')?.textContent).toContain('diferente a la actual');
  });
});
