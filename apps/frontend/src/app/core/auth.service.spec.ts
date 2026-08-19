import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Reproducido en vivo contra producción (email real recibido vía Resend/Gmail SMTP, sección de
 * configuración SMTP): el enlace de "Restablecer contraseña" llevaba a `localhost:3000` en vez de al
 * origen real — porque ni `signUp()` ni `resetPasswordForEmail()` pasaban `redirectTo`/
 * `emailRedirectTo`, así que Supabase caía al "Site URL" del Dashboard (nunca actualizado desde el
 * valor de scaffolding). Se calcula con `window.location.origin` (no un valor fijo de un solo
 * entorno) para que funcione igual en local, previews de Vercel y producción sin mantener tres
 * constantes distintas.
 */
describe('AuthService — redirects de email', () => {
  let signUpSpy: jasmine.Spy;
  let resetPasswordForEmailSpy: jasmine.Spy;
  let service: AuthService;

  beforeEach(() => {
    signUpSpy = jasmine.createSpy('signUp').and.resolveTo({ data: {}, error: null });
    resetPasswordForEmailSpy = jasmine
      .createSpy('resetPasswordForEmail')
      .and.resolveTo({ data: {}, error: null });

    TestBed.configureTestingModule({
      providers: [
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            auth: {
              signUp: signUpSpy,
              resetPasswordForEmail: resetPasswordForEmailSpy,
            },
          },
        },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('signUp() fija emailRedirectTo a la raíz del origen actual', async () => {
    await service.signUp('nueva@example.com', 'contraseñaLarga1');

    expect(signUpSpy).toHaveBeenCalledWith({
      email: 'nueva@example.com',
      password: 'contraseñaLarga1',
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
  });

  it('resetPasswordForEmail() fija redirectTo a /auth/reset-password del origen actual', async () => {
    await service.resetPasswordForEmail('alguien@example.com');

    expect(resetPasswordForEmailSpy).toHaveBeenCalledWith('alguien@example.com', {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
  });
});
