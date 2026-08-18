import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OwnUserProfile } from '@compatibility-check-app/shared-types';
import { POSTGRES_UNIQUE_VIOLATION } from '../supabase/postgres-error-codes';
import { SupabaseService } from '../supabase/supabase.service';
import { writableTable } from '../supabase/writable-table';
import { PhotoUploadService, UploadedPhoto } from './photo-upload.service';
import { asUserRow, toOwnUserProfile, USER_ROW_COLUMNS } from './user-profile.mapper';

export interface UpdateProfileInput {
  name: string;
  alias: string;
  qualityIds: string[];
  /** Si no se envía, se conserva la foto ya guardada (design.md — edición realista, no forzar
   *  volver a subir la foto en cada guardado de configuración). */
  photo?: UploadedPhoto;
}

/**
 * Servicio normal, sin Command (design.md, decisión 6b) para las lecturas y la edición del
 * perfil — a diferencia de la creación (`CreateUserProfileCommand`), editar no está en la lista de
 * Commands de la decisión 6b: no publica ningún evento que otros módulos necesiten escuchar, el
 * recálculo sigue siendo una acción explícita aparte (`RecalculateCompatibilityCommand`, sección 8).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly photoUploadService: PhotoUploadService,
  ) {}

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

  /** 404 si el usuario autenticado todavía no tiene fila de perfil (ver spec `user-registration`). */
  async getOwnProfile(userId: string): Promise<OwnUserProfile> {
    const { data: userRow, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select(USER_ROW_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo consultar el perfil: ${error.message}`);
    }
    if (!userRow) {
      throw new NotFoundException('Todavía no has completado tu perfil');
    }

    const qualityIds = await this.findQualityIds(userId);
    return toOwnUserProfile(asUserRow(userRow), qualityIds);
  }

  /**
   * Mismas validaciones de forma que la creación (name/alias/exactamente 5 cualidades ya
   * comprobadas en el controller); aquí decide si la nueva selección de cualidades difiere de la
   * guardada para marcar `needs_recalculation`, y traduce la violación de `UNIQUE(alias)` igual que
   * `CreateUserProfileHandler`.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<OwnUserProfile> {
    const currentQualityIds = await this.findQualityIds(userId);
    const qualitiesChanged = !sameQualitySelection(currentQualityIds, input.qualityIds);

    const photoUrl = input.photo
      ? await this.photoUploadService.upload(userId, input.photo)
      : undefined;

    const patch: { name: string; alias: string; photo_url?: string; needs_recalculation?: true } = {
      name: input.name,
      alias: input.alias,
    };
    if (photoUrl !== undefined) {
      patch.photo_url = photoUrl;
    }
    if (qualitiesChanged) {
      patch.needs_recalculation = true;
    }

    const client = this.supabaseService.getClient();
    const { data: updatedRow, error } = await writableTable(client, 'users')
      .update(patch)
      .eq('id', userId)
      .select(USER_ROW_COLUMNS)
      .single();

    if (error) {
      if (error.code === POSTGRES_UNIQUE_VIOLATION) {
        throw new ConflictException('El alias ya está en uso');
      }
      throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
    }

    if (qualitiesChanged) {
      await this.replaceQualities(userId, input.qualityIds);
    }

    return toOwnUserProfile(asUserRow(updatedRow), input.qualityIds);
  }

  private async findQualityIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('user_qualities')
      .select('quality_id')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`No se pudieron consultar las cualidades del perfil: ${error.message}`);
    }

    return ((data ?? []) as Array<{ quality_id: string }>).map((row) => row.quality_id);
  }

  private async replaceQualities(userId: string, qualityIds: string[]): Promise<void> {
    const client = this.supabaseService.getClient();

    const { error: deleteError } = await client
      .from('user_qualities')
      .delete()
      .eq('user_id', userId);
    if (deleteError) {
      throw new Error(
        `No se pudieron actualizar las cualidades del perfil: ${deleteError.message}`,
      );
    }

    const { error: insertError } = await writableTable(client, 'user_qualities').insert(
      qualityIds.map((qualityId) => ({ user_id: userId, quality_id: qualityId })),
    );
    if (insertError) {
      throw new Error(
        `No se pudieron actualizar las cualidades del perfil: ${insertError.message}`,
      );
    }
  }
}

function sameQualitySelection(current: string[], next: string[]): boolean {
  if (current.length !== next.length) {
    return false;
  }
  const sortedCurrent = [...current].sort();
  const sortedNext = [...next].sort();
  return sortedCurrent.every((id, index) => id === sortedNext[index]);
}
