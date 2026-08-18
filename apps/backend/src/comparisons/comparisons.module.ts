import { Module } from '@nestjs/common';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';
import { ComparisonsController } from './comparisons.controller';
import { ComparisonsService } from './comparisons.service';
import { MyComparisonsController } from './my-comparisons.controller';

@Module({
  imports: [CqrsLoggingModule],
  controllers: [ComparisonsController, MyComparisonsController],
  providers: [ComparisonsService],
})
export class ComparisonsModule {}
