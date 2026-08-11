import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CommandBus, ICommand } from '@nestjs/cqrs';
import { ModuleRef } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

/**
 * `CommandBus` con un único pipeline de logging enganchado (design.md, decisión 6b): registra
 * automáticamente inicio, fin y resultado de cualquier Command despachado (incluido el caso de
 * error del handler), con un identificador de correlación propio por despacho — evita repetir
 * logging manual en cada Command Handler.
 *
 * Usa `PinoLogger.root` (el logger raíz estático de nestjs-pino), no una instancia inyectada por
 * DI: los Commands pueden despacharse fuera de una request HTTP (p. ej. desde un handler de
 * evento), donde no hay contexto de request del que colgar un `PinoLogger` transient normal.
 */
@Injectable()
export class LoggingCommandBus extends CommandBus {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }

  override async execute<T extends ICommand, R = unknown>(command: T): Promise<R> {
    const correlationId = randomUUID();
    const commandName = command?.constructor?.name ?? 'UnknownCommand';
    const context = LoggingCommandBus.name;
    const logger = PinoLogger.root;

    logger.info({ correlationId, commandName, context }, 'Command dispatch started');

    try {
      const result = await super.execute<T, R>(command);
      logger.info({ correlationId, commandName, context }, 'Command dispatch finished');
      return result;
    } catch (error) {
      logger.error(
        {
          correlationId,
          commandName,
          context,
          error: error instanceof Error ? error.message : String(error),
        },
        'Command dispatch failed',
      );
      throw error;
    }
  }
}
