import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * Global para que cualquier módulo de dominio (`users`, `matching`, `ai`, ...) pueda inyectar
 * `SupabaseService` sin tener que reimportar este módulo en cada uno.
 */
@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
