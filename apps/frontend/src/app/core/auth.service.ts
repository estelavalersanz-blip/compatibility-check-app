import { Injectable, inject, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase-client';

/**
 * Envoltorio fino sobre Supabase Auth (design.md, decisión 3b) — el resto de la app nunca llama a
 * `@supabase/supabase-js` directamente, solo a este servicio.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly sessionSignal = signal<Session | null>(null);

  /**
   * Sesión actual, de solo lectura — hidratada por `initialize()` y mantenida al día por
   * `onAuthStateChange`. Pensada para bindings reactivos de plantilla (p. ej. `core/shell`, tarea
   * 11.1/11.2), NO para guards: un guard puede ejecutarse antes de que `initialize()` termine de
   * hidratar el signal en el arranque — usa `hasValidSession()` ahí en su lugar.
   */
  readonly session = this.sessionSignal.asReadonly();

  /**
   * Se ejecuta una única vez al arrancar la app, vía `provideAppInitializer` en `app.config.ts`,
   * ANTES de que el router resuelva la primera navegación — así `session()` ya tiene un valor real
   * (sesión o `null`) desde el primer render en vez de empezar siempre en `null` y parpadear.
   */
  async initialize(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.sessionSignal.set(data.session);
    this.supabase.auth.onAuthStateChange((_event, session) => this.sessionSignal.set(session));
  }

  hasSession(): boolean {
    return this.sessionSignal() !== null;
  }

  /**
   * Comprobación fresca contra Supabase (no depende de que `initialize()` ya haya hidratado el
   * signal) — para guards, que necesitan la respuesta correcta ya en la primerísima navegación de la
   * sesión de navegador, antes de que el `APP_INITIALIZER` termine.
   */
  async hasValidSession(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return data.session !== null;
  }

  /** `null` si no hay sesión — usado por `authInterceptor` para adjuntar el `Authorization` header. */
  getAccessToken(): string | null {
    return this.sessionSignal()?.access_token ?? null;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Sección 12 — cada método lanza el `AuthError` de Supabase tal cual si lo hay (nunca lo traduce a
   * un mensaje aquí: la decisión de qué mostrar depende de la pantalla — p. ej. login nunca distingue
   * cuál de los dos datos falló, registro sí distingue "email ya en uso"). El componente que llama
   * decide con `isAuthApiError`/`error.code` (`@supabase/supabase-js` re-exporta ambos de
   * `@supabase/auth-js`), no con comparación de mensajes en texto.
   */
  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }

  /** Con `enable_confirmations = false` (`supabase/config.toml`), abre sesión de inmediato — sin
   *  paso de confirmación por email (verificado contra el stack local: un email ya registrado
   *  responde con `AuthApiError`, `code: 'user_already_exists'`, no con un "falso éxito").
   *
   *  `emailRedirectTo` calculado con `window.location.origin`, no un valor fijo: en producción (con
   *  confirmación de email real, a diferencia de local) sin esto Supabase cae al "Site URL" del
   *  Dashboard — reproducido en vivo, seguía en el `localhost:3000` de scaffolding inicial, nunca
   *  actualizado. La raíz (`/`) es a propósito, no `/registration`: `mainRouteGuard` ya sabe mandar a
   *  un usuario recién confirmado sin perfil a completarlo, así no se duplica esa decisión aquí. */
  async signUp(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) {
      throw error;
    }
  }

  /** Verificado contra el stack local: un email inexistente responde `error: null` igual que uno
   *  existente — Supabase ya evita filtrar qué emails están registrados, sin necesitar lógica propia
   *  aquí para mostrar siempre el mismo mensaje de confirmación (spec `authentication`).
   *
   *  `redirectTo` con el mismo motivo que en `signUp()` — reproducido en vivo con el email real
   *  recibido: el enlace llevaba a `localhost:3000` en vez de a `/auth/reset-password`, la pantalla
   *  que ya existe justo para consumir este enlace. */
  async resetPasswordForEmail(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      throw error;
    }
  }

  /** Para la pantalla de destino del enlace de recuperación (tarea 12.7) — Supabase ya estableció la
   *  sesión de recuperación a partir del token de la URL antes de que este método se llame. */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw error;
    }
  }
}
