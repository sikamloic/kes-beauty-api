/**
 * Types de rôles utilisateur
 */
export type UserRole = 'provider' | 'client' | 'admin';

/**
 * Payload JWT standard
 * Utilisé pour tous les utilisateurs (providers, clients, admins)
 */
export interface JwtPayload {
  sub: number;           // userId (standard JWT)
  role: UserRole;        // Rôle principal
  roles?: UserRole[];    // Tous les rôles (si multi-rôles)
  providerId?: number;   // Si role = provider
  clientId?: number;     // Si role = client
  iat: number;           // Issued at (timestamp)
  exp: number;           // Expiration (timestamp)
}

/**
 * Paire de tokens (access + refresh)
 */
export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;     // Durée en secondes
}

/**
 * Données utilisateur extraites du JWT (après validation)
 */
export interface JwtUser {
  userId: number;
  role: UserRole;
  roles?: UserRole[];
  providerId?: number;
  clientId?: number;
}
