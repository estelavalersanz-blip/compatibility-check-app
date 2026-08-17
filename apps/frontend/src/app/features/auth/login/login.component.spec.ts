import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { LoginComponent } from './login.component';

function setInputValue(fixture: ComponentFixture<LoginComponent>, id: string, value: string): void {
  const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`#${id}`);
  if (!input) {
    throw new Error(`No se encontró el input #${id}`);
  }
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function submitForm(fixture: ComponentFixture<LoginComponent>): void {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  form?.dispatchEvent(new Event('submit'));
}

describe('LoginComponent (tarea 12.1)', () => {
  let signInSpy: jasmine.Spy;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    signInSpy = jasmine.createSpy('signInWithPassword');
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signInWithPassword: signInSpy } },
      ],
    });
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('rechaza el envío con email y contraseña vacíos, sin llamar al servicio', () => {
    submitForm(fixture);
    fixture.detectChanges();

    expect(signInSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.is-invalid').length).toBe(2);
  });

  it('muestra el error genérico de credenciales inválidas devuelto por Supabase', async () => {
    signInSpy.and.rejectWith({ name: 'AuthApiError', message: 'Invalid login credentials' });
    setInputValue(fixture, 'email', 'ada@example.com');
    setInputValue(fixture, 'password', 'incorrecta');

    submitForm(fixture);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(signInSpy).toHaveBeenCalledWith('ada@example.com', 'incorrecta');
    const root = fixture.nativeElement as HTMLElement;
    const alert = root.querySelector('.alert-danger');
    // Mensaje genérico que cubre ambos campos a la vez, sin señalar cuál en concreto falló (spec
    // authentication, "Login con credenciales incorrectas": "sin especificar cuál de los dos datos
    // es incorrecto") — "email o contraseña" es justo esa redacción no comprometida, no un fallo del
    // requisito por mencionar ambas palabras.
    expect(alert?.textContent).toContain('Email o contraseña incorrectos');
  });

  it('con credenciales válidas, navega a la ruta principal', async () => {
    signInSpy.and.resolveTo(undefined);
    setInputValue(fixture, 'email', 'ada@example.com');
    setInputValue(fixture, 'password', 'correcta123');

    submitForm(fixture);
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/');
  });
});
