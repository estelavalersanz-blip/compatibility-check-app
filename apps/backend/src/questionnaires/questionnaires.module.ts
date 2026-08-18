import { Module } from '@nestjs/common';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';
import { CompleteQuestionnaireHandler } from './commands/complete-questionnaire.handler';
import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';

@Module({
  imports: [CqrsLoggingModule],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService, CompleteQuestionnaireHandler],
})
export class QuestionnairesModule {}
