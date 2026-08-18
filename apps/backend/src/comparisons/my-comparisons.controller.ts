import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ComparisonSummary } from '@compatibility-check-app/shared-types';
import type { AuthenticatedRequest } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ComparisonsService } from './comparisons.service';

/**
 * `users/me/comparisons` (mismo patrón que `QuestionnairesController` en `users/me/questionnaire`):
 * controller propio porque la ruta no cuelga de `comparisons/...` — sigue siendo el mismo recurso
 * y el mismo `ComparisonsService` que `comparisons.controller.ts`.
 */
@Controller('users/me/comparisons')
@UseGuards(SupabaseAuthGuard)
export class MyComparisonsController {
  constructor(private readonly comparisonsService: ComparisonsService) {}

  @Get()
  findMine(@Req() request: AuthenticatedRequest): Promise<ComparisonSummary[]> {
    return this.comparisonsService.findMyComparisons(request.user.id);
  }
}
