import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CqrsLoggingModule } from './cqrs/cqrs-logging.module';
import { LoggerModule } from './logger/logger.module';
import { QualitiesModule } from './qualities/qualities.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
