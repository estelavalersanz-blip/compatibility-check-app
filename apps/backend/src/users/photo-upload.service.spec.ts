import { BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PhotoUploadService, UploadedPhoto } from './photo-upload.service';
import { SupabaseService } from '../supabase/supabase.service';

const TWO_MIB = 2 * 1024 * 1024;

function buildPhoto(overrides: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    buffer: Buffer.from('fake-image-bytes'),
    mimetype: overrides.mimetype ?? 'image/png',
    size: overrides.size ?? 1024,
  };
}

function buildService(
  upload: jest.Mock,
  getPublicUrl: jest.Mock = jest
    .fn()
    .mockReturnValue({ data: { publicUrl: 'https://storage.test/photo' } }),
): { service: PhotoUploadService; logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock } } {
  const supabaseService = {
    getClient: () => ({
      storage: {
        from: () => ({ upload, getPublicUrl }),
      },
    }),
  } as unknown as SupabaseService;

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), setContext: jest.fn() };

  return {
    service: new PhotoUploadService(supabaseService, logger as unknown as PinoLogger),
    logger,
  };
}

describe('PhotoUploadService', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'sube una foto %s válida y devuelve su URL pública, logueando el éxito sin el binario',
    async (mimetype) => {
      const upload = jest.fn().mockResolvedValue({ error: null });
      const { service, logger } = buildService(upload);

      const url = await service.upload('user-1', buildPhoto({ mimetype }));

      expect(url).toBe('https://storage.test/photo');
      expect(upload).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledTimes(1);
      const [fields] = logger.info.mock.calls[0] as [Record<string, unknown>];
      expect(fields).toMatchObject({ userId: 'user-1' });
      expect(JSON.stringify(fields)).not.toContain('fake-image-bytes');
    },
  );

  it('rechaza un formato no soportado sin llamar a Storage', async () => {
    const upload = jest.fn();
    const { service, logger } = buildService(upload);

    await expect(service.upload('user-1', buildPhoto({ mimetype: 'image/gif' }))).rejects.toThrow(
      BadRequestException,
    );
    expect(upload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('rechaza un archivo de más de 2MB sin llamar a Storage', async () => {
    const upload = jest.fn();
    const { service, logger } = buildService(upload);

    await expect(service.upload('user-1', buildPhoto({ size: TWO_MIB + 1 }))).rejects.toThrow(
      BadRequestException,
    );
    expect(upload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('acepta un archivo justo en el límite de 2MB', async () => {
    const upload = jest.fn().mockResolvedValue({ error: null });
    const { service } = buildService(upload);

    await expect(service.upload('user-1', buildPhoto({ size: TWO_MIB }))).resolves.toBe(
      'https://storage.test/photo',
    );
  });

  it('propaga un fallo de Storage como error y lo loguea', async () => {
    const upload = jest.fn().mockResolvedValue({ error: { message: 'network down' } });
    const { service, logger } = buildService(upload);

    await expect(service.upload('user-1', buildPhoto())).rejects.toThrow(/network down/);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
