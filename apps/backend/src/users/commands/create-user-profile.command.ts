import { ICommand } from '@nestjs/cqrs';
import { UploadedPhoto } from '../photo-upload.service';

/**
 * Alta del perfil de negocio (tabla `users`) para un usuario ya autenticado (design.md, decisión
 * 6b) — no existe hasta que se completa este comando; `userId` es el `id` de `auth.users`, ya
 * resuelto por `SupabaseAuthGuard` antes de llegar aquí.
 */
export class CreateUserProfileCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly alias: string,
    public readonly qualityIds: string[],
    public readonly photo: UploadedPhoto,
  ) {}
}
