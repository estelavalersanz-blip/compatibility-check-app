import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface TestAccount {
  id: string;
  email: string;
  password: string;
}

const POOL_FILE = join(__dirname, '.test-account-pool.json');

export function poolFilePath(): string {
  return POOL_FILE;
}

/**
 * Lee el pool de cuentas `auth.users` creado una única vez por `global-setup.ts` al arrancar
 * `test:integration`. El `globalSetup` de Jest corre en un proceso separado de los propios tests
 * (y de cada worker), así que las credenciales viajan por fichero, no por una variable en memoria.
 */
export function getTestAccountPool(): TestAccount[] {
  try {
    const raw = readFileSync(POOL_FILE, 'utf-8');
    return JSON.parse(raw) as TestAccount[];
  } catch {
    throw new Error(
      `No se pudo leer el pool de cuentas de test (${POOL_FILE}). ¿Se ejecutó el globalSetup de ` +
        `\`test:integration\`? No lo crees a mano ni lo ejecutes con \`jest\` directamente.`,
    );
  }
}
