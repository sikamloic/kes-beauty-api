import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur pour marquer un endpoint comme public (pas d'authentification requise)
 * Utilisé pour bypasser les guards au niveau du contrôleur
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
