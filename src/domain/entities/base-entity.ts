import { DomainEvent } from '@/src/shared/types/common';

// BaseEntity générique pour DDD avec props pattern
export abstract class BaseEntity<T extends Record<string, never> = Record<string, never>> {
  protected readonly props: T;
  private _domainEvents: DomainEvent[] = [];

  constructor(props: T) {
    this.props = { ...props };
  }

  public equals(other: BaseEntity<T>): boolean {
    if (this === other) return true;
    if (!other) return false;
    if (this.constructor !== other.constructor) return false;
    return this.id === other.id;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }

  public getUncommittedEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected touch(): void {
    // Cette méthode peut être implémentée par les entités qui ont besoin de tracking des updates
  }

  // Propriété abstraite que chaque entité doit implémenter selon sa logique métier
  abstract get id(): never;
}
