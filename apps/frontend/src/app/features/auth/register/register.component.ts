import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { isAuthApiError } from '@supabase/supabase-js';
import { Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../../core/auth-shell/auth-shell.component';
import { AuthService } from '../../../core/auth.service';
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  passwordStrengthValidator,
  passwordsMatchValidator,
} from '../../../shared/password-validators';

/**
 * Registro paso 1 (Shell B — spec `authentication`, "Registro con email y contraseña"; spec
 * `user-registration`). Solo email + contraseña: nombre/alias/foto/cualidades son el paso 2
 * (`features/registration`, sección 13, Shell A) — no confundir las dos pantallas.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrengthValidator]],
      passwordConfirm: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly passwordRequirementsMessage = PASSWORD_REQUIREMENTS_MESSAGE;

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    const { email, password } = this.form.getRawValue();
    try {
      await this.authService.signUp(email, password);
      await this.router.navigate(['/registration']);
    } catch (error) {
      // Se registra siempre en consola (igual que `main.ts` con errores de arranque): el mensaje
      // que ve el usuario es deliberadamente corto, pero un error sin más detalle en ningún sitio
      // es indiagnosticable — verificado en vivo: un 429 por rate limit de Supabase caía aquí y no
      // dejaba ningún rastro.
      console.error(error);
      this.submitError.set(this.resolveSignUpErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private resolveSignUpErrorMessage(error: unknown): string {
    if (isAuthApiError(error)) {
      if (error.code === 'user_already_exists') {
        return 'Ese email ya está en uso.';
      }
      // Limite de peticiones/envío de emails de Supabase (plan gratuito, sin SMTP propio) — se
      // comprueba por `status` (429), no por `code`: reproducido en vivo contra producción con un
      // email nunca usado (descarta que fuera un problema de esa cuenta), pero la herramienta de
      // red no capturó el cuerpo de la respuesta para confirmar el `code` exacto (¿el más probable,
      // `over_email_send_rate_limit`? ¿o `over_request_rate_limit`? no se pudo verificar cuál de
      // los dos). 429 cubre cualquiera de las dos sin tener que acertar el string exacto.
      if (error.status === 429) {
        return 'Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.';
      }
    }
    return 'No se pudo crear la cuenta. Inténtalo de nuevo.';
  }
}
