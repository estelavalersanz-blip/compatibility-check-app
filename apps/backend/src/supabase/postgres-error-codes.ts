/**
 * Códigos de error de Postgres que el backend necesita traducir a respuestas HTTP concretas, en vez
 * de dejarlos burbujear como error genérico. Compartido entre módulos (perfil, y en el futuro
 * `conversations`, que también tiene una restricción `UNIQUE`, design.md decisión 9).
 */
export const POSTGRES_UNIQUE_VIOLATION = '23505';
