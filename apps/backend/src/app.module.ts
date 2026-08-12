import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ComparisonsModule } from './comparisons/comparisons.module';
import { CqrsLoggingModule } from './cqrs/cqrs-logging.module';
import { LoggerModule } from './logger/logger.module';
import { MatchingModule } from './matching/matching.module';
import { QualitiesModule } from './qualities/qualities.module';
import { QuestionnairesModule } from './questionnaires/questionnaires.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    LoggerModule,
    CqrsLoggingModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    QualitiesModule,
    QuestionnairesModule,
    MatchingModule,
    AiModule,
    ComparisonsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
