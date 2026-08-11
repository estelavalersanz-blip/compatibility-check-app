import { Module } from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { LoggingCommandBus } from './logging-command-bus';

/**
 * Envuelve `CqrsModule` sustituyendo el `CommandBus` por defecto por `LoggingCommandBus`, para que
 * todo el árbol de inyección de dependencias (módulos de dominio incluidos) reciba de forma
 * transparente el logging automático de cada Command sin tener que importarlo explícitamente en
 * cada módulo.
 */
@Module({
  imports: [CqrsModule],
  providers: [{ provide: CommandBus, useClass: LoggingCommandBus }],
  exports: [CqrsModule, CommandBus],
})
export class CqrsLoggingModule {}
