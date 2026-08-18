import { Controller, Get } from '@nestjs/common';
import { Quality } from '@compatibility-check-app/shared-types';
import { QualitiesService } from './qualities.service';

/** Pública a propósito (ver `docs/plan.md`, "Endpoints backend clave"): no depende de sesión. */
@Controller('qualities')
export class QualitiesController {
  constructor(private readonly qualitiesService: QualitiesService) {}

  @Get()
  findAll(): Promise<Quality[]> {
    return this.qualitiesService.findAll();
  }
}
