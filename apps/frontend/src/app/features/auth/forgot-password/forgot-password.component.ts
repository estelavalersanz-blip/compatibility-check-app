import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../../core/auth-shell/auth-shell.component';
import { AuthService } from '../../../core/auth.service';

/**
 * "Olvidé mi contraseña" (Shell B — spec `authentication`, "Recuperación de contraseña por email").
 * Muestra el MISMO mensaje de confirmación exista o no el email — verificado contra el stack local
 * de Supabase que `resetPasswordForEmail` ya responde `error: null` en ambos casos (evita filtrar qué
 * emails están registrados), así que no hace falta ninguna lógica propia para no distinguirlos: basta
 * con no traducir un error inesperado (red, límite de peticiones) en el mismo mensaje de éxito.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    try {
      await this.authService.resetPasswordForEmail(this.form.getRawValue().email);
      this.submitted.set(true);
    } catch {
      this.submitError.set('No se pudo procesar la solicitud. Inténtalo de nuevo.');
    } finally {
      this.submitting.set(false);
    }
  }
}
