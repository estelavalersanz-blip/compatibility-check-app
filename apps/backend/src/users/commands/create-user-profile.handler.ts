import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { CreateUserProfileCommand } from './create-user-profile.command';
import { PhotoUploadService } from '../photo-upload.service';
import { POSTGRES_UNIQUE_VIOLATION } from '../../supabase/postgres-error-codes';
import { SupabaseService } from '../../supabase/supabase.service';
import { writableTable } from '../../supabase/writable-table';
import { asUserRow, toOwnUserProfile, USER_ROW_COLUMNS } from '../user-profile.mapper';

@CommandHandler(CreateUserProfileCommand)
export class CreateUserProfileHandler implements ICommandHandler<
  CreateUserProfileCommand,
  OwnUserProfile
> {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly photoUploadService: PhotoUploadService,
  ) {}

  async execute(command: CreateUserProfileCommand): Promise<OwnUserProfile> {
    const photoUrl = await this.photoUploadService.upload(command.userId, command.photo);
    const client = this.supabaseService.getClient();

    const { data, error } = await writableTable(client, 'users')
      .insert({ id: command.userId, name: command.name, alias: command.alias, photo_url: photoUrl })
      .select(USER_ROW_COLUMNS)
      .single();

    if (error) {
      // El alias ya pudo comprobarse como disponible vía GET /users/check-alias, pero eso no
      // descarta una condición de carrera (dos altas casi simultáneas con el mismo alias) — la
      // restricción UNIQUE de BD es la que de verdad decide, y aquí solo se traduce su fallo.
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException('El alias ya está en uso');
      }
      throw new Error(`No se pudo crear el perfil: ${error.message}`);
    }

    const { error: qualitiesError } = await writableTable(client, 'user_qualities').insert(
      command.qualityIds.map((qualityId) => ({ user_id: command.userId, quality_id: qualityId })),
    );

    if (qualitiesError) {
      throw new Error(
        `No se pudieron guardar las cualidades del perfil: ${qualitiesError.message}`,
      );
    }

    return toOwnUserProfile(asUserRow(data), command.qualityIds);
  }
}
