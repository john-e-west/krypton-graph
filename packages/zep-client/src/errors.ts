export class ZepError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'ZepError';
  }
}

export class ZEPRateLimitError extends ZepError {
  constructor(
    message = 'Rate limit exceeded',
    public readonly retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT');
    this.name = 'ZEPRateLimitError';
  }
}

export class ZEPConnectionError extends ZepError {
  constructor(
    message = 'Failed to connect to ZEP API',
    public readonly statusCode?: number
  ) {
    super(message, 'CONNECTION');
    this.name = 'ZEPConnectionError';
  }
}

export class ZEPAuthenticationError extends ZepError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH');
    this.name = 'ZEPAuthenticationError';
  }
}

export class ZEPValidationError extends ZepError {
  constructor(
    message = 'Validation failed',
    public readonly errors?: string[]
  ) {
    super(message, 'VALIDATION');
    this.name = 'ZEPValidationError';
  }
}

export class CircuitBreakerError extends ZepError {
  constructor(
    message = 'Circuit breaker is open',
    public readonly retryAfter: number
  ) {
    super(message, 'CIRCUIT_OPEN');
    this.name = 'CircuitBreakerError';
  }
}