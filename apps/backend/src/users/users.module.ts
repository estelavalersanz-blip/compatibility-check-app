import { Module } from '@nestjs/common';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';
import { CreateUserProfileHandler } from './commands/create-user-profile.handler';
import { PhotoUploadService } from './photo-upload.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CqrsLoggingModule],
  controllers: [UsersController],
  providers: [UsersService, PhotoUploadService, CreateUserProfileHandler],
})
export class UsersModule {}
