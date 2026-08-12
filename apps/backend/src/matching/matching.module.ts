import { Module } from '@nestjs/common';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';
import { CandidateSelectorService } from './candidate-selector.service';
import { RecalculateCompatibilityHandler } from './commands/recalculate-compatibility.handler';
import { QuestionnaireCompletedHandler } from './handlers/questionnaire-completed.handler';
import { MatchingController } from './matching.controller';

@Module({
  imports: [CqrsLoggingModule],
  controllers: [MatchingController],
  providers: [
    CandidateSelectorService,
    QuestionnaireCompletedHandler,
    RecalculateCompatibilityHandler,
  ],
})
export class MatchingModule {}
