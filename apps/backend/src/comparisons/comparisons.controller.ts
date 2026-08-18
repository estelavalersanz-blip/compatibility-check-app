import { BadRequestException, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ComparisonQuestionDetail } from '@compatibility-check-app/shared-types';
import { PinoLogger } from 'nestjs-pino';
import { AnalyzeComparisonCommand } from '../ai/commands/analyze-comparison.command';
import type { AuthenticatedRequest } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { ComparisonsService } from './comparisons.service';

interface ComparisonStatusRow {
  status: string;
}
function asComparisonStatusRow(row: unknown): ComparisonStatusRow | null {
  return row as ComparisonStatusRow | null;
}

/**
 * `comparisons` como recurso propio (ai-compatibility-analysis spec, "Reintento manual de una
 * comparación en error"). `GET /users/me/comparisons` vive aparte, en `my-comparisons.controller.ts`
 * (no cuelga de este prefijo) — pero comparte el mismo `ComparisonsService`.
 */
@Controller('comparisons')
@UseGuards(SupabaseAuthGuard)
export class ComparisonsController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly commandBus: CommandBus,
    private readonly logger: PinoLogger,
    private readonly comparisonsService: ComparisonsService,
  ) {
    this.logger.setContext(ComparisonsController.name);
  }

  /** Sección 10 — mismas reglas que `ComparisonsService.findDetail`: solo la propia comparación
   *  (404 tanto si no existe como si no es del usuario autenticado) y solo si ya está `completed`. */
  @Get(':id/detail')
  detail(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ComparisonQuestionDetail[]> {
    return this.comparisonsService.findDetail(id, request.user.id);
  }

  /**
   * Solo tiene sentido sobre una comparación ya en `error` — el propio `AnalyzeComparisonCommand`
   * (tarea 9.13) no valida esta precondición porque también lo despacha el análisis inicial desde
   * `pending` (handler de `ComparisonsCreatedEvent`); aquí sí se exige explícitamente, antes de
   * despachar, para no relanzar el análisis de una comparación que no está realmente atascada.
   *
   * Despacha el Command SIN esperar a que termine (`features/processing`, sección 15, sondea el
   * estado por su cuenta) — el análisis real puede tardar varios segundos con reintentos reales
   * contra el LLM; esperarlo aquí bloquearía la respuesta HTTP exactamente como no lo hace el
   * análisis inicial (ese llega por `EventBus.publish`, que tampoco espera a sus handlers).
   */
  @Post(':id/reanalyze')
  async reanalyze(@Param('id') id: string): Promise<{ status: string }> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('comparisons')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo consultar la comparación: ${error.message}`);
    }

    const row = asComparisonStatusRow(data);
    if (!row) {
      throw new BadRequestException('No existe esa comparación');
    }
    if (row.status !== 'error') {
      throw new BadRequestException('Solo se puede reintentar una comparación en estado "error"');
    }

    this.commandBus.execute(new AnalyzeComparisonCommand(id)).catch((dispatchError: unknown) => {
      this.logger.error(
        {
          comparisonId: id,
          error: dispatchError instanceof Error ? dispatchError.message : String(dispatchError),
        },
        'Fallo inesperado despachando el reintento de análisis',
      );
    });

    return { status: 'analyzing' };
  }
}
