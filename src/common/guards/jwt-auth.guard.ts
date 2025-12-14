import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JWT Auth Guard
 * 
 * Principe:
 * - Protège les endpoints avec authentification JWT
 * - Utilise JwtStrategy pour valider le token
 * - Ajoute req.user avec les données du JWT
 * - Respecte le décorateur @Public() pour bypasser l'authentification
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard)
 * 
 * Pour rendre un endpoint public:
 * @Public()
 * @Get('public-endpoint')
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Vérifier si l'endpoint est marqué comme public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Bypasser l'authentification
    }

    return super.canActivate(context);
  }
}
