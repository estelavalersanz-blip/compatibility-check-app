import { randomUUID } from 'node:crypto';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { CommandBus, ICommand } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';

/**
 * `CommandBus.execute` está sobrecargado (tres firmas, la última con `R = any` por defecto) —
 * `Function.prototype.bind` de TypeScript no tipa bien métodos sobrecargados y degrada el resultado
 * a `any`. Se re-tipa aquí como una única firma simple (a efectos de este wrapper no hace falta
 * más) para poder envolver `execute` sin arrastrar `any` al resto de la clase.
 */
interface ExecutableCommandBus {
  execute: (command: ICommand) => Promise<unknown>;
}

/**
 * `.bind()` sigue devolviendo `any` aquí (con `strictBindCallApply: false`, ver
 * `tsconfig.json`, TypeScript usa la firma menos precisa de `bind`/`call`/`apply`
 * independientemente del tipo de origen). Envolver el resultado en una función con tipo de retorno
 * declarado evita que `no-unsafe-assignment`/`no-unsafe-return` se disparen en el punto de uso —
 * mismo patrón que `asUserRow` en `user-profile.mapper.ts`.
 */
function bindExecute(bus: ExecutableCommandBus): (command: ICommand) => Promise<unknown> {
  return bus.execute.bind(bus) as (command: ICommand) => Promise<unknown>;
}

/**
 * Registra automáticamente inicio, fin y resultado de cualquier Command despachado (design.md,
 * decisión 6b), con un identificador de correlación propio por despacho — evita repetir logging
 * manual en cada Command Handler.
 *
 * Sustituye el método `execute` de la ÚNICA instancia real de `CommandBus` (la que exporta
 * `CqrsModule`, ver `cqrs-logging.module.ts` para el porqué de este enfoque en vez de
 * `{ provide: CommandBus, useClass: ... }`) en `onApplicationBootstrap` — después de que
 * `CqrsModule` ya haya registrado los handlers descubiertos, aunque el orden no importa: `execute`
 * lee el mapa de handlers en el momento de la llamada, no al parchear.
 */
@Injectable()
export class CommandLoggingBootstrapper implements OnApplicationBootstrap {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CommandLoggingBootstrapper.name);
  }

  onApplicationBootstrap(): void {
    const bus = this.commandBus as unknown as ExecutableCommandBus;
    const originalExecute = bindExecute(bus);

    bus.execute = async (command: ICommand): Promise<unknown> => {
      const correlationId = randomUUID();
      const commandName = command?.constructor?.name ?? 'UnknownCommand';

      this.logger.info({ correlationId, commandName }, 'Command dispatch started');

      try {
        const result = await originalExecute(command);
        this.logger.info({ correlationId, commandName }, 'Command dispatch finished');
        return result;
      } catch (error) {
        this.logger.error(
          {
            correlationId,
            commandName,
            error: error instanceof Error ? error.message : String(error),
          },
          'Command dispatch failed',
        );
        throw error;
      }
    };
  }
}
