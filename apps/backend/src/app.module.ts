import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CqrsLoggingModule } from './cqrs/cqrs-logging.module';
import { LoggerModule } from './logger/logger.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [LoggerModule, CqrsLoggingModule, SupabaseModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
