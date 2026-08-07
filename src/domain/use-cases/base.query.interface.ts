/**
 * Base des requêtes CQRS (côté lecture).
 * Chaque query porte un `queryType` unique servant de clé d'enregistrement
 * auprès du `CQRSBus`, à la manière de `whatpass_web`.
 */
export interface IQuery {
  readonly queryType: string;
}

/** Marqueur de résultat de query. */
export interface IQueryResult<T = unknown> {
  readonly data: T;
}

/**
 * Handler de query — reçoit la query, interroge le domaine/infra, renvoie un résultat typé.
 * Le 2ᵉ paramètre `R` est le type de résultat complet (`IQueryResult<T>`), à la manière de
 * `whatpass_web` (et non la donnée nue), pour rester compatible avec le bus générique.
 */
export interface IQueryHandler<Q extends IQuery = IQuery, R extends IQueryResult = IQueryResult> {
  readonly queryType: string;
  handle(query: Q): Promise<R>;
}

/** Fabrique de query : encapsule la construction d'une query depuis ses paramètres. */
export interface IQueryFactory<Q extends IQuery = IQuery> {
  create(...args: unknown[]): Q;
}