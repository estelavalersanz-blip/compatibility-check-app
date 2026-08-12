import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommandBus } from '@nestjs/cqrs';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import type { Request } from 'express';
import { type AuthenticatedRequest, resolveOptionalUser } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserProfileCommand } from './commands/create-user-profile.command';
import { UsersService } from './users.service';

interface ProfileRequestBody {
  name?: string;
  alias?: string;
  qualityIds: string[];
}

/**
 * Normaliza el cuerpo `multipart/form-data`: `qualityIds` puede llegar como un único valor (un
 * campo repetido una sola vez) o como array (repetido varias veces, el caso esperado con 5
 * cualidades) según cómo lo envíe el cliente — nunca se asume la forma, se normaliza siempre a array.
 */
function parseProfileBody(body: Record<string, unknown>): ProfileRequestBody {
  const name = typeof body.name === 'string' ? body.name.trim() : undefined;
  const alias = typeof body.alias === 'string' ? body.alias.trim() : undefined;
  const raw = body.qualityIds;
  const qualityIds = Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string')
    : typeof raw === 'string' && raw.length > 0
      ? [raw]
      : [];

  return { name, alias, qualityIds };
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
    private readonly commandBus: CommandBus,
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

  /**
   * Alta del perfil (registro paso 2, design.md decisión 3e) — primer endpoint protegido de
   * verdad por `SupabaseAuthGuard` (sección 6). El envío es una única llamada con nombre, alias,
   * foto y las 5 cualidades juntos, ya reunidos por el wizard de 2 pasos del frontend.
   */
  @Post('me/profile')
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async createProfile(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Body() rawBody: Record<string, unknown>,
  ): Promise<OwnUserProfile> {
    const { name, alias, qualityIds } = parseProfileBody(rawBody);

    if (!name || !alias) {
      throw new BadRequestException('"name" y "alias" son obligatorios');
    }
    if (qualityIds.length !== 5) {
      throw new BadRequestException('Debes seleccionar exactamente 5 cualidades');
    }
    if (!photo) {
      throw new BadRequestException('La foto de perfil es obligatoria');
    }

    return this.commandBus.execute<CreateUserProfileCommand, OwnUserProfile>(
      new CreateUserProfileCommand(request.user.id, name, alias, qualityIds, {
        buffer: photo.buffer,
        mimetype: photo.mimetype,
        size: photo.size,
      }),
    );
  }

  /** 404 si el usuario autenticado todavía no ha completado el perfil (ver `UsersService`). */
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getOwnProfile(@Req() request: AuthenticatedRequest): Promise<OwnUserProfile> {
    return this.usersService.getOwnProfile(request.user.id);
  }

  /**
   * Mismas validaciones que la creación (nombre/alias obligatorios, exactamente 5 cualidades); a
   * diferencia de la creación, la foto es opcional — si no se reenvía, se conserva la ya guardada
   * (ver `UsersService.updateProfile`).
   */
  @Patch('me')
  @UseGuards(SupabaseAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async updateProfile(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Body() rawBody: Record<string, unknown>,
  ): Promise<OwnUserProfile> {
    const { name, alias, qualityIds } = parseProfileBody(rawBody);

    if (!name || !alias) {
      throw new BadRequestException('"name" y "alias" son obligatorios');
    }
    if (qualityIds.length !== 5) {
      throw new BadRequestException('Debes seleccionar exactamente 5 cualidades');
    }

    return this.usersService.updateProfile(request.user.id, {
      name,
      alias,
      qualityIds,
      photo: photo
        ? { buffer: photo.buffer, mimetype: photo.mimetype, size: photo.size }
        : undefined,
    });
  }
}
