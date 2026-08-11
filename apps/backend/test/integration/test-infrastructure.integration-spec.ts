import { createSupabaseUserTestClient } from '../setup/supabase-admin-client';
import { getTestAccountPool } from '../setup/test-account-pool';

/**
 * Valida la propia infraestructura de test de integración (tarea 1.13): el pool de cuentas creado
 * por `global-setup.ts` es fijo (3-4 cuentas), sus credenciales son usables (login real contra el
 * stack local), y sigue siendo el mismo pool sin recrearse entre los tests de este archivo.
 */
describe('infraestructura de test de integración', () => {
  it('expone un pool fijo de 3 a 4 cuentas ya creadas contra el stack local', () => {
    const pool = getTestAccountPool();

    expect(pool.length).toBeGreaterThanOrEqual(3);
    expect(pool.length).toBeLessThanOrEqual(4);

    for (const account of pool) {
      expect(account.id).toBeTruthy();
      expect(account.email).toMatch(/@integration-test\.afinia\.local$/);
      expect(account.password).toBeTruthy();
    }
  });

  it('cada cuenta del pool puede autenticarse de verdad contra el stack local', async () => {
    const pool = getTestAccountPool();

    for (const account of pool) {
      const client = await createSupabaseUserTestClient(account.email, account.password);
      const { data, error } = await client.auth.getUser();

      expect(error).toBeNull();
      expect(data.user?.id).toBe(account.id);
    }
  });

  it('devuelve el mismo pool (mismos ids) si se lee dos veces dentro de la misma ejecución', () => {
    const first = getTestAccountPool();
    const second = getTestAccountPool();

    expect(second.map((a) => a.id)).toEqual(first.map((a) => a.id));
  });
});
