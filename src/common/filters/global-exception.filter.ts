import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { PrismaExceptionHandler } from '../exceptions/prisma.exception';

/**
 * Filtre global de gestion des exceptions
 * Principe SOLID:
 * - SRP: Responsabilité unique = transformer exceptions en réponses HTTP
 * - OCP: Ouvert à l'extension via BaseException
 * - DIP: Dépend de l'abstraction BaseException
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log selon la sévérité
    this.logException(exception, errorResponse, request);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Construit la réponse d'erreur standardisée
   */
  private buildErrorResponse(
    exception: unknown,
    request: Request,
  ): ErrorResponseDto {
    const path = request.url;

    // Cas 1: Exception custom (BaseException)
    if (exception instanceof BaseException) {
      return {
        success: false,
        ...exception.toJSON(),
        path,
      } as ErrorResponseDto;
    }

    // Cas 2: Erreur Prisma (avant HttpException car Prisma peut wrapper des HttpException)
    if (this.isPrismaError(exception)) {
      const prismaException = PrismaExceptionHandler.handle(exception);
      return {
        success: false,
        ...prismaException.toJSON(),
        path,
      } as ErrorResponseDto;
    }

    // Cas 3: HttpException NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      return {
        success: false,
        statusCode: status,
        code: this.getCodeFromStatus(status),
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : String(
                (exceptionResponse as Record<string, unknown>).message ||
                  exception.message,
              ),
        timestamp: new Date().toISOString(),
        path,
        details:
          typeof exceptionResponse === 'object'
            ? (exceptionResponse as Record<string, unknown>)
            : undefined,
      };
    }

    // Cas 4: Erreur inconnue (500)
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Une erreur interne est survenue'
          : exception instanceof Error
            ? exception.message
            : 'Erreur inconnue',
      timestamp: new Date().toISOString(),
      path,
      details:
        process.env.NODE_ENV !== 'production' && exception instanceof Error
          ? {
              stack: exception.stack,
              name: exception.name,
            }
          : undefined,
    };
  }

  /**
   * Log l'exception selon sa sévérité
   */
  private logException(
    exception: unknown,
    errorResponse: ErrorResponseDto,
    request: Request,
  ): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';

    const logContext = {
      method,
      url,
      ip,
      userAgent,
      statusCode: errorResponse.statusCode,
      code: errorResponse.code,
    };

    // Erreurs 5xx = error (critique)
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `${errorResponse.code}: ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
        JSON.stringify(logContext),
      );
    }
    // Erreurs 4xx = warn (client)
    else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `${errorResponse.code}: ${errorResponse.message}`,
        JSON.stringify(logContext),
      );
    }
    // Autres = log
    else {
      this.logger.log(
        `${errorResponse.code}: ${errorResponse.message}`,
        JSON.stringify(logContext),
      );
    }
  }

  /**
   * Détecte si l'erreur provient de Prisma
   */
  private isPrismaError(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const errorName = (exception as Error).name;
    const errorConstructor = (exception as Record<string, unknown>).constructor
      ?.name;

    // Détection par nom de classe
    return (
      errorName?.startsWith('Prisma') ||
      errorConstructor?.startsWith('Prisma') ||
      // Détection par propriétés spécifiques Prisma
      'code' in exception ||
      'clientVersion' in exception ||
      'errorCode' in exception
    );
  }

  /**
   * Génère un code d'erreur à partir du status HTTP
   */
  private getCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusMap[status] || `HTTP_${status}`;
  }
}
