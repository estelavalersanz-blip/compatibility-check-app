import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Única instancia del cliente de Supabase del frontend (design.md, decisión 3b: "el frontend Angular
 * usa `@supabase/supabase-js` directamente"). Un `InjectionToken` con `factory` en vez de un servicio
 * `@Injectable` normal porque no hay estado propio de Angular que envolver aquí — el estado de sesión
 * reactivo vive en `AuthService`, que inyecta este token en vez de llamar a `createClient()` por su
 * cuenta (así los tests pueden sustituir el cliente completo con `overrideProvider` si alguna vez
 * hace falta, aunque en la práctica los tests de componentes/guards sustituyen `AuthService` entero).
 */
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => createClient(environment.supabaseUrl, environment.supabaseAnonKey),
});
