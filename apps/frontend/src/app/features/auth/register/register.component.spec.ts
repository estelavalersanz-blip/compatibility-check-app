import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { RegisterComponent } from './register.component';

@Component({ standalone: true, template: '' })
class BlankComponent {}

function setInputValue(fixture: ComponentFixture<RegisterComponent>, id: string, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`No se encontró el input #${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(fixture: ComponentFixture<RegisterComponent>): void {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  form?.dispatchEvent(new Event('submit'));
}

describe('RegisterComponent (tarea 12.3)', () => {
  let signUpSpy: jasmine.Spy;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(() => {
    signUpSpy = jasmine.createSpy('signUp');
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([{ path: 'registration', component: BlankComponent }]),
        { provide: AuthService, useValue: { signUp: signUpSpy } },
      ],
    });
    fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
  });

  it('rechaza un email con formato inválido, sin llamar al servicio', () => {
    setInputValue(fixture, 'email', 'no-es-un-email');
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    fixture.detectChanges();

    expect(signUpSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#email')?.classList.contains('is-invalid')).toBe(true);
  });

  it('rechaza una contraseña por debajo del mínimo de 8 caracteres, sin llamar al servicio', () => {
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'corta1');
    setInputValue(fixture, 'passwordConfirm', 'corta1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(signUpSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#password')?.classList.contains('is-invalid')).toBe(true);
  });

  /**
   * Requisitos endurecidos el 2026-08-20 a petición explícita de la usuaria: además del mínimo de 8
   * caracteres (ya cubierto en el test anterior), hace falta mayúscula, minúscula y carácter
   * especial. Caso distinto a propósito: 8+ caracteres pero sin mayúscula ni especial, para
   * comprobar que el formulario rechaza estas condiciones nuevas de verdad, no solo la longitud.
   */
  it('rechaza una contraseña con longitud suficiente pero sin mayúscula ni carácter especial', () => {
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'todaminuscula1');
    setInputValue(fixture, 'passwordConfirm', 'todaminuscula1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(signUpSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#password')?.classList.contains('is-invalid')).toBe(true);
  });

  /**
   * Bug real reportado por la usuaria: el mensaje de "Mínimo 8 caracteres" (`.invalid-feedback`) se
   * quedaba en el rojo por defecto de Bootstrap (`$danger`, sin recompilar aquí), casi ilegible sobre
   * el degradado naranja→rojo de Shell B (contraste medido ~1.3-1.8:1, muy por debajo del 4.5:1 de
   * WCAG AA — rojo sobre naranja/rojo es el peor caso posible). Mismo criterio que el resto de texto
   * suelto de esta pantalla (`.auth-shell .form-label`/`.form-text`/`a`, ya en blanco): ver
   * `styles.scss`.
   */
  it('el mensaje de "Mínimo 8 caracteres" es blanco, no el rojo por defecto (bug real: casi ilegible sobre el degradado)', () => {
    setInputValue(fixture, 'email', 'nueva@example.com');
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

  it('muestra el error de email ya en uso sin crear una cuenta duplicada', async () => {
    // `isAuthApiError` (usado por el componente) comprueba el marcador `__isAuthError`, no
    // `instanceof AuthApiError` — verificado leyendo la implementación real de `@supabase/auth-js`.
    signUpSpy.and.rejectWith({
      __isAuthError: true,
      name: 'AuthApiError',
      message: 'User already registered',
      status: 422,
      code: 'user_already_exists',
    });
    setInputValue(fixture, 'email', 'ya-existe@example.com');
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(signUpSpy).toHaveBeenCalledWith('ya-existe@example.com', 'ContraseñaLarga1!');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.alert-danger')?.textContent).toContain('ya está en uso');
  });

  it('muestra un mensaje especifico si Supabase limita el envio de emails (429)', async () => {
    // Reproducido en vivo contra produccion: un signUp con email nunca usado tambien devuelve este
    // codigo cuando se ha superado el limite de emails de Supabase (plan gratuito, sin SMTP propio)
    // — no es un fallo especifico de esa cuenta, así que el mensaje no debe sonar a "prueba otro
    // email", sino a "espera".
    signUpSpy.and.rejectWith({
      __isAuthError: true,
      name: 'AuthApiError',
      message: 'Email rate limit exceeded',
      status: 429,
      code: 'over_email_send_rate_limit',
    });
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.alert-danger')?.textContent).toContain('Demasiados intentos');
  });

  it('con datos válidos, crea la cuenta y navega a completar perfil (paso 2)', async () => {
    signUpSpy.and.resolveTo(undefined);
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'ContraseñaLarga1!');
    setInputValue(fixture, 'passwordConfirm', 'ContraseñaLarga1!');

    submitForm(fixture);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/registration');
  });
});
