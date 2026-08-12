import { Module } from '@nestjs/common';
import { CqrsLoggingModule } from '../cqrs/cqrs-logging.module';
import { ComparisonsController } from './comparisons.controller';

/**
 * Sección 9 solo necesita `POST /comparisons/:id/reanalyze` — la sección 10 añadirá aquí mismo
 * `GET /users/me/comparisons`/`GET /comparisons/:id/detail` y los servicios de lectura que hagan
 * falta, sobre el mismo controller y módulo.
 */
@Module({
  imports: [CqrsLoggingModule],
  controllers: [ComparisonsController],
})
export class ComparisonsModule {}
