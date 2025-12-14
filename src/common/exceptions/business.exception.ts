import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

/**
 * Exception pour les erreurs métier (business logic)
 * Principe SOLID: OCP - Extension de BaseException
 */
export class BusinessException extends BaseException {
  constructor(
    message: string,
    code: string = 'BUSINESS_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message, code, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

/**
 * Exception pour les ressources non trouvées
 */
export class NotFoundException extends BaseException {
  constructor(
    resource: string,
    identifier?: string | number,
    details?: Record<string, unknown>,
  ) {
    const message = identifier
      ? `${resource} avec l'identifiant '${identifier}' introuvable`
      : `${resource} introuvable`;

    super(message, 'RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, {
      resource,
      identifier,
      ...details,
    });
  }
}

/**
 * Exception pour les conflits (ex: double booking, email déjà utilisé)
 */
export class ConflictException extends BaseException {
  constructor(
    message: string,
    code: string = 'CONFLICT',
    details?: Record<string, unknown>,
  ) {
    super(message, code, HttpStatus.CONFLICT, details);
  }
}

/**
 * Exception pour les validations métier échouées
 */
export class ValidationException extends BaseException {
  constructor(
    message: string,
    validationErrors?: Record<string, string[]>,
  ) {
    super(message, 'VALIDATION_ERROR', HttpStatus.BAD_REQUEST, {
      validationErrors,
    });
  }
}

/**
 * Exception pour les erreurs d'autorisation
 */
export class ForbiddenException extends BaseException {
  constructor(
    message: string = 'Accès refusé',
    details?: Record<string, unknown>,
  ) {
    super(message, 'FORBIDDEN', HttpStatus.FORBIDDEN, details);
  }
}

/**
 * Exception pour les erreurs d'authentification
 */
export class UnauthorizedException extends BaseException {
  constructor(
    message: string = 'Non authentifié',
    details?: Record<string, unknown>,
  ) {
    super(message, 'UNAUTHORIZED', HttpStatus.UNAUTHORIZED, details);
  }
}
