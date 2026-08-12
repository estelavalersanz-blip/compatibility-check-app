import { Injectable } from '@nestjs/common';
import { Quality } from '@compatibility-check-app/shared-types';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Servicio normal, sin Command (design.md, decisión 6b): es una lectura simple del catálogo fijo
 * de las 15 cualidades personales, poblado por el script de seed (sección 18) — este servicio solo
 * lo expone, no lo gestiona.
 */
@Injectable()
export class QualitiesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /** Orden de inserción (`created_at`), no alfabético — preserva el orden del catálogo confirmado. */
  async findAll(): Promise<Quality[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('qualities')
      .select('id, name')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`No se pudo consultar el catálogo de cualidades: ${error.message}`);
    }

    return data ?? [];
  }
}
