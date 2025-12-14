import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';

/**
 * Intercepteur de logging des requêtes et erreurs
 * Principe SOLID:
 * - SRP: Responsabilité unique = logging
 * - OCP: Extensible via configuration
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const startTime = Date.now();

    // Log requête entrante
    this.logger.log(
      `→ ${method} ${url} | IP: ${ip} | UA: ${userAgent.substring(0, 50)}`,
    );

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;

        // Log réponse succès
        this.logger.log(
          `← ${method} ${url} | Status: ${statusCode} | Duration: ${duration}ms`,
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log erreur (sera aussi loggée par le GlobalExceptionFilter)
        this.logger.error(
          `✗ ${method} ${url} | Error: ${error.message || 'Unknown'} | Duration: ${duration}ms`,
        );

        return throwError(() => error);
      }),
    );
  }
}
