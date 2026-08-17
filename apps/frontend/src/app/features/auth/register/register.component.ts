import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { isAuthApiError } from '@supabase/supabase-js';
import { Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../../core/auth-shell/auth-shell.component';
import { AuthService } from '../../../core/auth.service';
import { passwordMinLengthValidator, passwordsMatchValidator } from '../../../shared/password-validators';

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
      password: ['', [Validators.required, passwordMinLengthValidator]],
      passwordConfirm: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

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
      this.submitError.set(
        isAuthApiError(error) && error.code === 'user_already_exists'
          ? 'Ese email ya está en uso.'
          : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
