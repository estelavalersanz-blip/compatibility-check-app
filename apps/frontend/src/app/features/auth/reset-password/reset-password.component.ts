import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthShellComponent } from '../../../core/auth-shell/auth-shell.component';
import { AuthService } from '../../../core/auth.service';
import { passwordMinLengthValidator, passwordsMatchValidator } from '../../../shared/password-validators';

/**
 * Pantalla de destino del enlace de recuperación (Shell B — spec `authentication`, "Establecimiento
 * de nueva contraseña desde el enlace"; tarea 12.7). Supabase ya establece la sesión de recuperación
 * a partir del token de la URL antes de que esta pantalla se monte (`detectSessionInUrl`, activo por
 * defecto en `createClient` en el navegador) — no hace falta leer ningún parámetro a mano aquí.
 * Al terminar, navega a `/` (no a login): la sesión de recuperación YA es una sesión válida, así que
 * el guard de la ruta principal (sección 11) decide el destino normal, igual que tras un login.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, AuthShellComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
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
    try {
      await this.authService.updatePassword(this.form.getRawValue().password);
      await this.router.navigate(['/']);
    } catch {
      this.submitError.set('No se pudo actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
