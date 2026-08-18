/**
 * Configuración de entorno de producción (tarea 19.3) — sustituye a `environment.ts` en el build de
 * producción vía `fileReplacements` (`angular.json`, configuración `production`). Mismos valores no
 * sensibles que `environment.ts` (ver el comentario de ese fichero: `supabaseAnonKey` está diseñada
 * por Supabase para ser pública, la protección real vive en las políticas RLS de la BD), esta vez
 * apuntando al proyecto real de Supabase (tarea 19.1) y al backend real en Render (tarea 19.2) en vez
 * del stack local.
 */
export const environment = {
  production: true,
  supabaseUrl: 'https://ajqhpwikzjygdycptcfp.supabase.co',
  supabaseAnonKey: 'sb_publishable_h-CnIovzHm2MvasLz8eoQg_eCKfuqQ_',
  apiBaseUrl: 'https://compatibility-check-app.onrender.com',
};
