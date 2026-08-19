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
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(signUpSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#email')?.classList.contains('is-invalid')).toBe(true);
  });

  it('rechaza una contraseña por debajo de la fortaleza mínima (8 caracteres), sin llamar al servicio', () => {
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'corta1');
    setInputValue(fixture, 'passwordConfirm', 'corta1');

    submitForm(fixture);
    fixture.detectChanges();

    expect(signUpSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#password')?.classList.contains('is-invalid')).toBe(true);
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
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(signUpSpy).toHaveBeenCalledWith('ya-existe@example.com', 'contraseñaLarga1');
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
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.alert-danger')?.textContent).toContain('Demasiados intentos');
  });

  it('con datos válidos, crea la cuenta y navega a completar perfil (paso 2)', async () => {
    signUpSpy.and.resolveTo(undefined);
    setInputValue(fixture, 'email', 'nueva@example.com');
    setInputValue(fixture, 'password', 'contraseñaLarga1');
    setInputValue(fixture, 'passwordConfirm', 'contraseñaLarga1');

    submitForm(fixture);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/registration');
  });
});
