import { Body, Controller, Get, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Answer } from '@compatibility-check-app/shared-types';
import type { AuthenticatedRequest } from '../auth/supabase-token';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CompleteQuestionnaireCommand } from './commands/complete-questionnaire.command';
import { QuestionnairesService } from './questionnaires.service';

/**
 * Base `users/me/questionnaire` (no un `@Controller('questionnaires')` aparte): las rutas de esta
 * sección operan siempre sobre el cuestionario del propio usuario autenticado, igual que
 * `UsersController` ya hace con `users/me...` (sección 6). El body de cada endpoint es directamente
 * el array de respuestas (`AnswerSet`), sin envolverlo en un objeto — el mismo array que
 * `personal-questionnaire` spec exige persistir tal cual.
 */
@Controller('users/me/questionnaire')
@UseGuards(SupabaseAuthGuard)
export class QuestionnairesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly questionnairesService: QuestionnairesService,
  ) {}

  /**
   * Envío final (design.md, decisión 6b): exige las 36 respuestas y dispara
   * `QuestionnaireCompletedEvent` al terminar. Toda la validación (forma, duplicados, "¿ya estaba
   * completado?") vive en `CompleteQuestionnaireCommandHandler`, no aquí — este controller solo
   * traduce HTTP ↔ Command, igual que `UsersController.createProfile` con `CreateUserProfileCommand`.
   */
  @Post()
  complete(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Answer[]> {
    return this.commandBus.execute<CompleteQuestionnaireCommand, Answer[]>(
      new CompleteQuestionnaireCommand(request.user.id, body),
    );
  }

  /**
   * Edición de un cuestionario ya completado (decisión 6b: servicio normal, sin Command — no
   * publica ningún evento, el recálculo sigue siendo la acción explícita aparte de la sección 8).
   */
  @Patch()
  edit(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Answer[]> {
    return this.questionnairesService.replaceAnswers(request.user.id, body);
  }

  /** Borrador (decisión 5c): 0-36 respuestas, nunca dispara el pipeline de matching/IA. */
  @Put('draft')
  saveDraft(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<Answer[]> {
    return this.questionnairesService.saveDraft(request.user.id, body);
  }

  /** Respuestas guardadas hasta el momento (parciales o completas) — `[]` si no hay ninguna. */
  @Get()
  getMine(@Req() request: AuthenticatedRequest): Promise<Answer[]> {
    return this.questionnairesService.findAnswers(request.user.id);
  }
}
