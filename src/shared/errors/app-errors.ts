/**
 * Base application error – all custom errors should extend this.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * 401 – authentication required.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'You must be logged in') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 – authenticated but not allowed.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 400 – validation error (e.g., wrong input).
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 404 – resource not found.
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * 400 – insufficient funds (financial operations).
 */
export class InsufficientFundsError extends AppError {
  constructor(asset: string) {
    super(`Insufficient ${asset} balance`, 400, 'INSUFFICIENT_FUNDS');
  }
}

/**
 * 409 – duplicate request / idempotency conflict.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}