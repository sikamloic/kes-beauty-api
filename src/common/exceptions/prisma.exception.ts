import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { DatabaseException } from './technical.exception';

// Types Prisma - Import conditionnel pour éviter erreur si client pas généré
type PrismaError = Error & {
  code?: string;
  meta?: Record<string, unknown>;
  errorCode?: string;
  clientVersion?: string;
  message: string;
};

/**
 * Mapping des erreurs Prisma vers exceptions custom
 * Principe SOLID: SRP - Responsabilité unique = traduire erreurs Prisma
 */
export class PrismaExceptionHandler {
  /**
   * Convertit une erreur Prisma en exception custom appropriée
   */
  static handle(error: unknown): BaseException {
    const prismaError = error as PrismaError;
    const errorName = (error as Error).name;

    // Erreur Prisma connue (PrismaClientKnownRequestError)
    if (errorName === 'PrismaClientKnownRequestError' && prismaError.code) {
      return this.handleKnownError(prismaError);
    }

    // Erreur de validation Prisma
    if (errorName === 'PrismaClientValidationError') {
      return this.handleValidationError(prismaError);
    }

    // Erreur d'initialisation Prisma
    if (errorName === 'PrismaClientInitializationError') {
      return this.handleInitializationError(prismaError);
    }

    // Erreur de connexion Prisma (Rust panic)
    if (errorName === 'PrismaClientRustPanicError') {
      return this.handleRustPanicError(prismaError);
    }

    // Erreur inconnue
    return new DatabaseException(
      'Erreur base de données inconnue',
      error instanceof Error ? error : undefined,
    );
  }

  /**
   * Gère les erreurs Prisma connues (P2xxx)
   */
  private static handleKnownError(error: PrismaError): BaseException {
    const { code, meta } = error;

    switch (code) {
      // P2002: Contrainte unique violée
      case 'P2002': {
        const target = (meta?.target as string[]) || [];
        return new UniqueConstraintException(target, meta);
      }

      // P2003: Contrainte FK violée
      case 'P2003': {
        const field = (meta?.field_name as string) || 'unknown';
        return new ForeignKeyConstraintException(field, meta);
      }

      // P2025: Record non trouvé
      case 'P2025': {
        return new RecordNotFoundException(meta);
      }

      // P2024: Timeout connexion
      case 'P2024': {
        return new ConnectionTimeoutException(meta);
      }

      // P2034: Transaction échouée
      case 'P2034': {
        return new TransactionFailedException(meta);
      }

      // P2037: Trop de connexions
      case 'P2037': {
        return new TooManyConnectionsException(meta);
      }

      // Autres erreurs Prisma
      default: {
        return new DatabaseException(
          `Erreur Prisma ${code}: ${error.message}`,
          error,
          { code, meta },
        );
      }
    }
  }

  /**
   * Gère les erreurs de validation Prisma
   */
  private static handleValidationError(error: PrismaError): BaseException {
    return new DatabaseException(
      'Erreur validation requête base de données',
      error,
      {
        type: 'VALIDATION_ERROR',
        hint: 'Vérifier les types et contraintes des champs',
      },
    );
  }

  /**
   * Gère les erreurs d'initialisation (connexion BD)
   */
  private static handleInitializationError(error: PrismaError): BaseException {
    const { errorCode, message } = error;

    // Erreur de connexion
    if (errorCode === 'P1001' || message.includes('connect')) {
      return new DatabaseConnectionException(message, {
        errorCode,
        hint: 'Vérifier que MySQL est démarré et accessible',
      });
    }

    // Erreur d'authentification
    if (errorCode === 'P1002' || message.includes('authentication')) {
      return new DatabaseAuthenticationException(message, {
        errorCode,
        hint: 'Vérifier DATABASE_URL (user/password)',
      });
    }

    // Erreur base de données inexistante
    if (errorCode === 'P1003' || message.includes('does not exist')) {
      return new DatabaseNotFoundException(message, {
        errorCode,
        hint: 'Créer la base de données ou vérifier DATABASE_URL',
      });
    }

    return new DatabaseException(
      `Erreur initialisation Prisma: ${message}`,
      error,
      { errorCode },
    );
  }

  /**
   * Gère les panics Rust (erreurs critiques)
   */
  private static handleRustPanicError(error: PrismaError): BaseException {
    return new DatabaseException(
      'Erreur critique moteur base de données',
      error,
      {
        type: 'RUST_PANIC',
        severity: 'CRITICAL',
      },
    );
  }
}

/**
 * Exception pour contrainte unique violée (ex: email déjà utilisé)
 */
export class UniqueConstraintException extends BaseException {
  constructor(fields: string[], meta?: Record<string, unknown>) {
    const fieldList = fields.join(', ');
    super(
      `Contrainte unique violée sur: ${fieldList}`,
      'UNIQUE_CONSTRAINT_VIOLATION',
      HttpStatus.CONFLICT,
      {
        fields,
        ...meta,
      },
    );
  }
}

/**
 * Exception pour contrainte FK violée
 */
export class ForeignKeyConstraintException extends BaseException {
  constructor(field: string, meta?: Record<string, unknown>) {
    super(
      `Contrainte clé étrangère violée sur: ${field}`,
      'FOREIGN_KEY_CONSTRAINT_VIOLATION',
      HttpStatus.UNPROCESSABLE_ENTITY,
      {
        field,
        ...meta,
      },
    );
  }
}

/**
 * Exception pour record non trouvé
 */
export class RecordNotFoundException extends BaseException {
  constructor(meta?: Record<string, unknown>) {
    super(
      'Enregistrement introuvable',
      'RECORD_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      meta,
    );
  }
}

/**
 * Exception pour timeout connexion BD
 */
export class ConnectionTimeoutException extends BaseException {
  constructor(meta?: Record<string, unknown>) {
    super(
      'Timeout connexion base de données',
      'DATABASE_CONNECTION_TIMEOUT',
      HttpStatus.GATEWAY_TIMEOUT,
      {
        hint: 'La base de données met trop de temps à répondre',
        ...meta,
      },
    );
  }
}

/**
 * Exception pour transaction échouée
 */
export class TransactionFailedException extends BaseException {
  constructor(meta?: Record<string, unknown>) {
    super(
      'Transaction base de données échouée',
      'TRANSACTION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
      meta,
    );
  }
}

/**
 * Exception pour trop de connexions
 */
export class TooManyConnectionsException extends BaseException {
  constructor(meta?: Record<string, unknown>) {
    super(
      'Trop de connexions à la base de données',
      'TOO_MANY_CONNECTIONS',
      HttpStatus.SERVICE_UNAVAILABLE,
      {
        hint: 'Augmenter connection_limit dans DATABASE_URL ou fermer connexions inutilisées',
        ...meta,
      },
    );
  }
}

/**
 * Exception pour erreur connexion BD
 */
export class DatabaseConnectionException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Impossible de se connecter à la base de données: ${message}`,
      'DATABASE_CONNECTION_ERROR',
      HttpStatus.SERVICE_UNAVAILABLE,
      details,
    );
  }
}

/**
 * Exception pour erreur authentification BD
 */
export class DatabaseAuthenticationException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Erreur authentification base de données: ${message}`,
      'DATABASE_AUTHENTICATION_ERROR',
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}

/**
 * Exception pour base de données inexistante
 */
export class DatabaseNotFoundException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      `Base de données introuvable: ${message}`,
      'DATABASE_NOT_FOUND',
      HttpStatus.INTERNAL_SERVER_ERROR,
      details,
    );
  }
}
