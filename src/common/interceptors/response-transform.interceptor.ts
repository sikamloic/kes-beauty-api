import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponseHelper, ResponseMetaDto } from '../dto/api-response.dto';

/**
 * Intercepteur pour transformer automatiquement les réponses
 * Principe SOLID: SRP - Responsabilité unique = transformation réponses
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;

        // Si la réponse est déjà formatée (contient success), on la retourne telle quelle
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Métadonnées de base
        const meta: Partial<ResponseMetaDto> = {
          timestamp: new Date().toISOString(),
          path: request.path,
          method: request.method,
          duration,
        };

        // Si c'est un tableau, on considère que c'est une liste (sans pagination)
        if (Array.isArray(data)) {
          return ApiResponseHelper.success(data, 'Liste récupérée avec succès', meta);
        }

        // Si c'est un objet avec pagination
        if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
          return ApiResponseHelper.paginated(
            data.items,
            data.pagination,
            'Liste récupérée avec succès',
            meta,
          );
        }

        // Réponse standard
        return ApiResponseHelper.success(data, 'Opération réussie', meta);
      }),
    );
  }
}
