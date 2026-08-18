import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthenticatedRequest, resolveOptionalUser } from './supabase-token';

/**
 * Guard de ruta que exige un JWT de Supabase válido en `Authorization: Bearer <token>` (design.md,
 * decisión 3b): el backend no reimplementa verificación de firma ni gestiona un secreto de JWT
 * propio, delega en el servicio de Auth de Supabase a través de `SupabaseService`. Si el token es
 * válido, adjunta el usuario resuelto a `request.user` para que los controladores no repitan la
 * consulta. Se aplica con `@UseGuards(SupabaseAuthGuard)` a los endpoints protegidos de perfil,
 * cuestionario y comparaciones a medida que esos módulos se implementan (secciones 6-10).
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await resolveOptionalUser(this.supabaseService, request.headers.authorization);

    if (!user) {
      throw new UnauthorizedException('Se requiere una sesión autenticada válida');
    }

    request.user = user;
    return true;
  }
}
