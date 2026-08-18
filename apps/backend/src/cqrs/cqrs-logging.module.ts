import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandLoggingBootstrapper } from './command-logging.bootstrapper';

/**
 * Envuelve `CqrsModule` añadiendo logging automático de cada Command despachado (design.md,
 * decisión 6b) sin sustituir `CommandBus` por una subclase vía
 * `{ provide: CommandBus, useClass: ... }`: `CqrsModule.onApplicationBootstrap()` registra los
 * handlers descubiertos sobre SU PROPIA instancia interna de `CommandBus` (`handlers` es un `Map`
 * de instancia, ver `command-bus.js`) — un override declarado en otro módulo que solo hace
 * `imports: [CqrsModule]` no sustituye esa instancia interna, crea una segunda, huérfana, sin
 * ningún handler registrado. Confirmado de verdad: `CreateUserProfileCommand` (sección 6, el primer
 * `@CommandHandler` real del proyecto) lanzaba `CommandHandlerNotFoundException` pese a estar
 * declarado como provider — nada lo detectó antes porque hasta entonces ningún Command real llegaba
 * a dispatchearse contra el árbol de módulos completo.
 *
 * En su lugar, `CommandLoggingBootstrapper` recibe inyectada la ÚNICA instancia real de
 * `CommandBus` (la que exporta `CqrsModule`, sin token propio que la sustituya) y le sustituye el
 * método `execute` en `onApplicationBootstrap` — sigue siendo la misma instancia con los handlers
 * ya registrados, así que todo el árbol de inyección de dependencias recibe el logging automático
 * sin tener que importar nada explícitamente en cada módulo de dominio.
 */
@Module({
  imports: [CqrsModule],
  providers: [CommandLoggingBootstrapper],
  exports: [CqrsModule],
})
export class CqrsLoggingModule {}
