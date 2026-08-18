import type { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

/** Usuario resuelto a partir de un JWT de Supabase válido (design.md, decisión 3b). */
export interface SupabaseUser {
  id: string;
  email?: string;
}

/** Request de Express con el usuario ya resuelto por `SupabaseAuthGuard`/`resolveOptionalUser`. */
export interface AuthenticatedRequest extends Request {
  user: SupabaseUser;
}

/** Extrae el token de un header `Authorization: Bearer <token>`, o `null` si no tiene ese formato. */
export function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Resuelve el usuario autenticado a partir del header `Authorization`, delegando en el propio
 * servicio de Auth de Supabase (`auth.getUser(token)`) — nunca lanza si el token falta o es
 * inválido/expirado, a diferencia de `SupabaseAuthGuard`. Pensado para endpoints que aceptan tanto
 * tráfico anónimo como autenticado y solo necesitan saber "quién soy, si alguien" (p. ej.
 * `GET /users/check-alias`, que excluye al propio usuario de la comprobación cuando hay sesión,
 * pero no la exige).
 */
export async function resolveOptionalUser(
  supabaseService: SupabaseService,
  authorizationHeader: string | undefined,
): Promise<SupabaseUser | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseService.getClient().auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? undefined };
}
