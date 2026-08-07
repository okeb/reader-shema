/**
 * Base des commandes CQRS (côté écriture).
 * Aucune commande n'est implémentée pour l'instant (app read-only) ; ce squelette
 * est prêt pour le compte-sync / l'auth (spec 22), à la manière de `whatpass_web`.
 */
export interface ICommand {
  readonly commandType: string;
}

export interface ICommandResult<T = unknown> {
  readonly data: T;
}

export interface ICommandHandler<C extends ICommand = ICommand, R = unknown> {
  readonly commandType: string;
  handle(command: C): Promise<ICommandResult<R>>;
}