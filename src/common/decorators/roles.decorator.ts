import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../interfaces';

/**
 * Décorateur @Roles
 * 
 * Principe:
 * - Définit les rôles autorisés pour un endpoint
 * - Utilisé avec RolesGuard
 * 
 * Usage:
 * @Roles('provider')
 * @Roles('provider', 'admin')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
