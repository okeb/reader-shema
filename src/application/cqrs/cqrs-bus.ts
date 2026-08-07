import type { ICommand, ICommandResult, ICommandHandler } from '@/src/domain/use-cases/base.command.interface';
import type { IQuery, IQueryResult, IQueryHandler } from '@/src/domain/use-cases/base.query.interface';

/**
 * Bus CQRS (Application Layer) — port de `whatpass_web/src/application/cqrs/cqrs-bus.ts`,
 * débarrassé des imports auth. Registres commande + query prêts pour le compte-sync (spec 22).
 */
export class CQRSBus {
  private commandHandlers = new Map<string, ICommandHandler<ICommand, ICommandResult>>();
  private queryHandlers = new Map<string, IQueryHandler<IQuery, IQueryResult>>();

  registerCommandHandler<C extends ICommand, R extends ICommandResult>(
    commandType: string,
    handler: ICommandHandler<C, R>,
  ): void {
    if (this.commandHandlers.has(commandType)) {
      throw new Error(`Command handler for ${commandType} is already registered`);
    }
    this.commandHandlers.set(commandType, handler as unknown as ICommandHandler<ICommand, ICommandResult>);
  }

  registerQueryHandler<Q extends IQuery, R extends IQueryResult>(
    queryType: string,
    handler: IQueryHandler<Q, R>,
  ): void {
    if (this.queryHandlers.has(queryType)) {
      throw new Error(`Query handler for ${queryType} is already registered`);
    }
    this.queryHandlers.set(queryType, handler as unknown as IQueryHandler<IQuery, IQueryResult>);
  }

  async executeCommand<R extends ICommandResult>(command: ICommand): Promise<R> {
    const handler = this.commandHandlers.get(command.commandType);
    if (!handler) throw new Error(`No handler registered for command: ${command.commandType}`);
    try {
      return (await handler.handle(command)) as R;
    } catch (error) {
      console.error(`Error executing command ${command.commandType}:`, error);
      throw error;
    }
  }

  async executeQuery<R extends IQueryResult>(query: IQuery): Promise<R> {
    const handler = this.queryHandlers.get(query.queryType);
    if (!handler) throw new Error(`No handler registered for query: ${query.queryType}`);
    try {
      return (await handler.handle(query as IQuery)) as R;
    } catch (error) {
      console.error(`Error executing query ${query.queryType}:`, error);
      throw error;
    }
  }

  hasCommandHandler(commandType: string): boolean {
    return this.commandHandlers.has(commandType);
  }

  hasQueryHandler(queryType: string): boolean {
    return this.queryHandlers.has(queryType);
  }

  /** Réinitialise les registres (tests / re-configuration à chaud). */
  clear(): void {
    this.commandHandlers.clear();
    this.queryHandlers.clear();
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.commandHandlers.keys());
  }

  getRegisteredQueries(): string[] {
    return Array.from(this.queryHandlers.keys());
  }
}

/** Singleton du bus, exposé pour le DI container et les hooks. */
export const cqrsBus = new CQRSBus();