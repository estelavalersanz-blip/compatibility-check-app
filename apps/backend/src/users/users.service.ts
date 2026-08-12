import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Servicio normal, sin Command (design.md, decisión 6b): es una lectura, no una escritura con
 * efecto de dominio. Empieza solo con la comprobación de alias (sección 4 de tasks.md); las
 * secciones 6/7 lo amplían con la creación/edición del perfil de usuario.
 */
@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Un alias está disponible si ninguna fila de `users` lo tiene ya asignado — o si la única fila
   * que lo tiene es la del propio `excludeUserId`, para que en configuración el alias ya asignado
   * al usuario autenticado no se marque como ocupado por sí mismo.
   */
  async isAliasAvailable(alias: string, excludeUserId?: string): Promise<boolean> {
    const query = this.supabaseService.getClient().from('users').select('id').eq('alias', alias);
    const filtered = excludeUserId ? query.neq('id', excludeUserId) : query;

    const { data, error } = await filtered.maybeSingle();
    if (error) {
      throw new Error(`No se pudo comprobar la disponibilidad del alias: ${error.message}`);
    }

    return data === null;
  }
}
