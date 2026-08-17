/**
 * Configuración de entorno del frontend. A diferencia de `apps/backend/.env` (que sí guarda un
 * secreto real, `SUPABASE_SERVICE_ROLE_KEY`), aquí no hay nada sensible: la `supabaseAnonKey` está
 * diseñada por Supabase para ser pública (la protección real vive en las políticas RLS de la BD), y
 * `supabaseUrl`/`apiBaseUrl` son solo endpoints. Por eso este fichero SÍ se comitea (a diferencia de
 * `.env`) — es el equivalente frontend de un `.env.example` ya relleno con los valores de desarrollo
 * local, no un placeholder a rellenar a mano.
 *
 * Valores de desarrollo: los que expone `npx supabase start` por defecto (mismo JWT "supabase-demo"
 * fijo de la CLI, ver README) y el backend NestJS en `npm run start:dev` (`http://localhost:3000`).
 * Cuando exista el proyecto real de Supabase/Render (tarea 19.1/19.2), este fichero pasará a tener un
 * equivalente `environment.production.ts` con `fileReplacements` en `angular.json` — no se configura
 * antes porque esos valores todavía no existen (ver memoria del proyecto).
 */
export const environment = {
  production: false,
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  apiBaseUrl: 'http://localhost:3000',
};
