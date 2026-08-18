import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';

function setInputValue(
  fixture: ComponentFixture<ForgotPasswordComponent>,
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

function submitForm(fixture: ComponentFixture<ForgotPasswordComponent>): void {
  const form = (fixture.nativeElement as HTMLElement).querySelector('form');
  form?.dispatchEvent(new Event('submit'));
}

async function submitWithEmail(
  fixture: ComponentFixture<ForgotPasswordComponent>,
  email: string,
): Promise<void> {
  setInputValue(fixture, 'email', email);
  submitForm(fixture);
  await fixture.whenStable();
  fixture.detectChanges();
}

describe('ForgotPasswordComponent (tarea 12.5)', () => {
  let resetSpy: jasmine.Spy;
  let fixture: ComponentFixture<ForgotPasswordComponent>;

  beforeEach(() => {
    resetSpy = jasmine.createSpy('resetPasswordForEmail').and.resolveTo(undefined);
    TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { resetPasswordForEmail: resetSpy } },
      ],
    });
    fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
  });

  it('muestra el mismo mensaje de confirmación con un email que sí existe', async () => {
    await submitWithEmail(fixture, 'existe@example.com');

    expect(resetSpy).toHaveBeenCalledWith('existe@example.com');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('recibirás un enlace');
    expect(root.querySelector('form')).toBeNull();
  });

  it('muestra exactamente el mismo mensaje de confirmación con un email que no existe', async () => {
    // Verificado contra el stack local: resetPasswordForEmail responde `error: null` igual para un
    // email inexistente que para uno existente — el fake refleja ese mismo comportamiento real.
    await submitWithEmail(fixture, 'no-existe@example.com');

    expect(resetSpy).toHaveBeenCalledWith('no-existe@example.com');
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('recibirás un enlace');
    expect(root.querySelector('form')).toBeNull();
  });

  it('rechaza un email con formato inválido, sin llamar al servicio', () => {
    setInputValue(fixture, 'email', 'no-es-un-email');
    submitForm(fixture);
    fixture.detectChanges();

    expect(resetSpy).not.toHaveBeenCalled();
  });
});
