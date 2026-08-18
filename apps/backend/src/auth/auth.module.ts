import { Global, Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';

/**
 * Global (mismo motivo que `SupabaseModule`): cualquier módulo de dominio (`users`,
 * `questionnaires`, `comparisons`, ...) puede aplicar `@UseGuards(SupabaseAuthGuard)` a sus
 * endpoints protegidos sin tener que reimportar este módulo en cada uno.
 */
@Global()
@Module({
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
