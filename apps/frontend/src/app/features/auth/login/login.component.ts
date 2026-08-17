import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../../core/auth-shell/auth-shell.component';
import { AuthService } from '../../../core/auth.service';

/**
 * Login (Shell B — spec `authentication`, "Inicio de sesión con email y contraseña"). El mensaje de
 * error nunca distingue si falló el email o la contraseña (tarea 12.1) — Supabase ya responde con un
 * único `AuthApiError` genérico para ambos casos, así que basta con no inventar una distinción propia.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
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
      await this.authService.signInWithPassword(email, password);
      await this.router.navigate(['/']);
    } catch {
      this.submitError.set('Email o contraseña incorrectos.');
    } finally {
      this.submitting.set(false);
    }
  }
}
