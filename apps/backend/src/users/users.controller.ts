import { BadRequestException, Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { resolveOptionalUser } from '../auth/supabase-token';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Pública a propósito, sin `SupabaseAuthGuard`: la comprobación de disponibilidad de alias es
   * útil incluso sin sesión. Si la petición sí trae un JWT válido, excluye el propio alias del
   * usuario autenticado de la comprobación (ver `UsersService.isAliasAvailable`) — necesario para
   * que, en configuración, el alias ya asignado al usuario no se muestre como ocupado.
   */
  @Get('check-alias')
  async checkAlias(
    @Query('alias') alias: string | undefined,
    @Req() request: Request,
  ): Promise<{ available: boolean }> {
    if (!alias?.trim()) {
      throw new BadRequestException('El parámetro "alias" es obligatorio');
    }

    const currentUser = await resolveOptionalUser(
      this.supabaseService,
      request.headers.authorization,
    );
    const available = await this.usersService.isAliasAvailable(alias, currentUser?.id);
    return { available };
  }
}
