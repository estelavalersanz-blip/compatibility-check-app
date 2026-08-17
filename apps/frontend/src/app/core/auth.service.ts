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
}
