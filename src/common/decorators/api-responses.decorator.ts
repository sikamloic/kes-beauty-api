import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Décorateurs Swagger réutilisables
 * Principe SOLID: DRY + OCP - Réutilisables et extensibles
 */

/**
 * Réponses d'erreur standards
 */
export const ApiStandardErrors = () => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Requête invalide (validation échouée)',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Non authentifié',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Accès refusé',
      type: ErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'Erreur serveur interne',
      type: ErrorResponseDto,
    }),
  );
};

/**
 * Réponse 404 Not Found
 */
export const ApiNotFoundResponse = (resource: string) => {
  return ApiResponse({
    status: 404,
    description: `${resource} introuvable`,
    type: ErrorResponseDto,
  });
};

/**
 * Réponse 409 Conflict
 */
export const ApiConflictResponse = (description: string) => {
  return ApiResponse({
    status: 409,
    description,
    type: ErrorResponseDto,
  });
};

/**
 * Réponse 201 Created avec type
 */
export const ApiCreatedResponse = <T>(
  description: string,
  type?: Type<T>,
  example?: unknown,
) => {
  const config: Record<string, unknown> = {
    status: 201,
    description,
    type,
  };

  if (example) {
    config.schema = { example };
  }

  return ApiResponse(config);
};

/**
 * Réponse 200 OK avec type
 */
export const ApiOkResponse = <T>(
  description: string,
  type?: Type<T>,
  example?: unknown,
) => {
  const config: Record<string, unknown> = {
    status: 200,
    description,
    type,
  };

  if (example) {
    config.schema = { example };
  }

  return ApiResponse(config);
};

/**
 * Réponse 204 No Content
 */
export const ApiNoContentResponse = (description: string) => {
  return ApiResponse({
    status: 204,
    description,
  });
};

/**
 * Décorateur combiné pour endpoints CRUD standards
 */
export const ApiCrudResponses = () => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: 'Opération réussie',
    }),
    ApiNotFoundResponse('Ressource'),
    ApiStandardErrors(),
  );
};

/**
 * Décorateur pour endpoints nécessitant authentification
 */
export const ApiAuthRequired = () => {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: 'Token JWT manquant ou invalide',
      type: ErrorResponseDto,
    }),
  );
};

/**
 * Décorateur pour endpoints pagination
 */
export const ApiPaginatedResponse = <T>(type: Type<T>) => {
  return ApiResponse({
    status: 200,
    description: 'Liste paginée',
    schema: {
      allOf: [
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: `#/components/schemas/${type.name}` },
            },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 100 },
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 10 },
                totalPages: { type: 'number', example: 10 },
              },
            },
          },
        },
      ],
    },
  });
};
