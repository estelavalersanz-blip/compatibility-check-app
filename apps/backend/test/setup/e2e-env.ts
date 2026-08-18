/**
 * Los tests e2e (`*.e2e-spec.ts`) arrancan `AppModule` completo en memoria, pero — a diferencia de
 * los de integración — nunca deben depender de Docker ni de credenciales reales (design.md,
 * decisión 11). `SupabaseService` exige `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` al construirse
 * (falla rápido si faltan de verdad, tarea 3.6), así que aquí se rellenan con valores ficticios
 * solo para que el módulo arranque — `createClient` no conecta a red hasta que se usa. Un test
 * concreto que necesite controlar el comportamiento de Supabase debe sustituir `SupabaseService`
 * con `.overrideProvider(SupabaseService).useValue(...)` en su propio `TestingModule`, no confiar
 * en estos valores.
 */
process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'e2e-test-placeholder-service-role-key';
