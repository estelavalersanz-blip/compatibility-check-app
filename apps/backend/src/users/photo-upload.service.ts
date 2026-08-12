import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SupabaseService } from '../supabase/supabase.service';

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/** `jpg`/`png`/`webp` únicamente — mismo catálogo que `allowed_mime_types` en `supabase/config.toml`. */
const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// 2 MiB — mismo límite que `file_size_limit` del bucket `user-photos` (supabase/config.toml).
// Segunda barrera, no la única (docs/architecture.md): nunca confiar solo en la config del bucket.
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

const BUCKET = 'user-photos';

/**
 * Sube la foto de perfil al bucket `user-photos` de Supabase Storage (design.md, decisión 3c;
 * `docs/architecture.md` documenta la configuración del bucket). Valida formato y tamaño aquí antes
 * de subir nada — nunca confía solo en el límite configurado del bucket.
 */
@Injectable()
export class PhotoUploadService {
  // `PinoLogger` normal + `setContext(...)` manual, no `@InjectPinoLogger(context)`: ese decorador
  // registra su token en un Set global en el momento en que se importa la clase decorada, y
  // `LoggerModule.forRoot()` (importado antes que `UsersModule` en `app.module.ts`) ya construye su
  // lista de providers en ese instante — si el token de esta clase llega tarde al registro, la
  // inyección falla en cualquier módulo importado después de `LoggerModule` (visto de verdad: los
  // e2e de esta clase fallaban con "Nest can't resolve dependencies... PinoLogger:PhotoUploadService").
  // `PinoLogger` a secas sí es un provider incondicional, sin ese problema de orden.
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PhotoUploadService.name);
  }

  /** Devuelve la URL pública de la foto ya subida. `path` es estable por usuario (`upsert: true`). */
  async upload(userId: string, photo: UploadedPhoto): Promise<string> {
    const extension = EXTENSION_BY_MIME_TYPE[photo.mimetype];
    if (!extension) {
      this.logger.warn(
        { userId, mimetype: photo.mimetype },
        'Foto de perfil rechazada: formato no soportado',
      );
      throw new BadRequestException(
        `Formato de foto no soportado: ${photo.mimetype}. Usa jpg, png o webp.`,
      );
    }

    if (photo.size > MAX_SIZE_BYTES) {
      this.logger.warn(
        { userId, size: photo.size },
        'Foto de perfil rechazada: supera el tamaño máximo de 2MB',
      );
      throw new BadRequestException('La foto supera el tamaño máximo de 2MB.');
    }

    const path = `${userId}/photo.${extension}`;
    const { error } = await this.supabaseService
      .getClient()
      .storage.from(BUCKET)
      .upload(path, photo.buffer, { contentType: photo.mimetype, upsert: true });

    if (error) {
      this.logger.error({ userId, error: error.message }, 'Fallo al subir la foto de perfil');
      throw new Error(`No se pudo subir la foto de perfil: ${error.message}`);
    }

    const { data } = this.supabaseService.getClient().storage.from(BUCKET).getPublicUrl(path);
    this.logger.info({ userId }, 'Foto de perfil subida correctamente');
    return data.publicUrl;
  }
}
