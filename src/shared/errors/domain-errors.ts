export abstract class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
  }

  public readonly field?: string;
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier ${identifier} not found`, 'NOT_FOUND');
    this.resource = resource;
    this.identifier = identifier;
  }

  public readonly resource: string;
  public readonly identifier: string;
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

export class InfrastructureError extends DomainError {
  constructor(message: string, originalError?: Error) {
    super(message, 'INFRASTRUCTURE_ERROR');
    this.originalError = originalError;
  }

  public readonly originalError?: Error;
}