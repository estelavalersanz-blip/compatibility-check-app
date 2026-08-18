import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

/**
 * Única puerta de acceso a datos con la `service_role` key (design.md, decisión 3c): las lecturas
 * cruzadas entre usuarios que necesita, por ejemplo, `candidate-selector.service.ts` pasan por
 * aquí, nunca por el cliente directo del frontend. El resto de servicios del backend dependen de
 * esta clase, no de `@supabase/supabase-js` directamente, para no filtrar detalles de Postgres
 * (nombres de tabla, columnas) fuera de la capa de acceso a datos.
 *
 * Tipo del cliente inferido de `createClient` (no el `SupabaseClient` bare exportado por el
 * paquete) — ambos no siempre coinciden estructuralmente entre versiones, ver el mismo ajuste en
 * `test/setup/supabase-admin-client.ts`.
 */
@Injectable()
export class SupabaseService {
  private readonly client: ReturnType<typeof createClient>;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
      throw new Error('SUPABASE_URL no está definida — revisa apps/backend/.env.example');
    }
    if (!serviceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY no está definida — revisa apps/backend/.env.example',
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getClient(): ReturnType<typeof createClient> {
    return this.client;
  }
}
