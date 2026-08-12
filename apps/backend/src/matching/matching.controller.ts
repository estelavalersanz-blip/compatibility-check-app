import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SelectedCandidate } from './candidate-selector.service';
import { RecalculateCompatibilityCommand } from './commands/recalculate-compatibility.command';

/**
 * `users/me/recalculate` (design.md, decisión 5b) — atajo manual bajo demanda a la regla de
 * cálculo único: solo tiene efecto sobre las propias comparaciones del usuario autenticado.
 */
@Controller('users/me')
@UseGuards(SupabaseAuthGuard)
export class MatchingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('recalculate')
  recalculate(@Req() request: AuthenticatedRequest): Promise<SelectedCandidate[]> {
    return this.commandBus.execute<RecalculateCompatibilityCommand, SelectedCandidate[]>(
      new RecalculateCompatibilityCommand(request.user.id),
    );
  }
}
