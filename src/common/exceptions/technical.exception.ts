import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

/**
 * Exception pour les erreurs techniques (infrastructure, base de données, etc.)
 * Principe SOLID: OCP - Extension de BaseException
 */
export class TechnicalException extends BaseException {
  constructor(
    message: string,
    code: string = 'TECHNICAL_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}

/**
 * Exception pour les erreurs de base de données
 */
export class DatabaseException extends TechnicalException {
  constructor(
    message: string,
    originalError?: Error,
    details?: Record<string, unknown>,
  ) {
    super(message, 'DATABASE_ERROR', {
      originalError: originalError?.message,
      ...details,
    });
  }
}

/**
 * Exception pour les erreurs d'API externe (paiement, SMS, etc.)
 */
export class ExternalServiceException extends TechnicalException {
  constructor(
    serviceName: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Erreur service externe ${serviceName}: ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      {
        serviceName,
        ...details,
      },
    );
  }
}

/**
 * Exception pour les erreurs de configuration
 */
export class ConfigurationException extends TechnicalException {
  constructor(
    configKey: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Erreur configuration ${configKey}: ${message}`,
      'CONFIGURATION_ERROR',
      {
        configKey,
        ...details,
      },
    );
  }
}

/**
 * Exception pour les timeouts
 */
export class TimeoutException extends TechnicalException {
  constructor(
    operation: string,
    timeoutMs: number,
    details?: Record<string, unknown>,
  ) {
    super(
      `Timeout lors de l'opération ${operation} (${timeoutMs}ms)`,
      'TIMEOUT_ERROR',
      {
        operation,
        timeoutMs,
        ...details,
      },
    );
  }
}
