import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../interfaces';

/**
 * Roles Guard
 * 
 * Principe:
 * - Vérifie que l'utilisateur a le bon rôle
 * - Utilisé avec le décorateur @Roles()
 * - Doit être utilisé APRÈS JwtAuthGuard
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('provider', 'admin')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Pas de rôles requis = accès autorisé
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false; // Pas d'utilisateur = accès refusé
    }

    // Vérifier rôle principal
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Vérifier rôles multiples (si présents)
    if (user.roles && Array.isArray(user.roles)) {
      return requiredRoles.some((role) => user.roles.includes(role));
    }

    return false;
  }
}
