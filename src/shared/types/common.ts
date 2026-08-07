export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValueObject<T> {
  equals(other: ValueObject<T>): boolean;
  getValue(): T;
}

export interface DomainEvent {
  id: string;
  aggregateId: string;
  eventType: string;
  occurredOn: Date;
  version: number;
}

export interface Command {
  id: string;
  timestamp: Date;
}

export interface Query {
  id: string;
}

export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;