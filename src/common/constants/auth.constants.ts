/**
 * Constantes d'authentification centralisées
 * 
 * Principe SOLID:
 * - SRP: Fichier dédié aux constantes auth
 * - OCP: Facile à étendre sans modifier le code existant
 */

/**
 * Configuration des sessions et tokens
 */
export const AUTH_CONSTANTS = {
  /** Nombre maximum de sessions actives par utilisateur */
  MAX_SESSIONS_PER_USER: 5,

  /** Nombre de rounds bcrypt (12 recommandé en 2026) */
  BCRYPT_ROUNDS: 12,

  /** Durée de validité du refresh token en jours */
  REFRESH_TOKEN_DAYS: 7,

  /** Durée de validité du refresh token en millisecondes */
  REFRESH_TOKEN_MS: 7 * 24 * 60 * 60 * 1000,

  /** Hash factice pour protection timing attack */
  DUMMY_HASH: '$2b$12$TimingAttackProtectionDummyHashValue',
} as const;

/**
 * Configuration du rate limiting
 */
export const RATE_LIMIT = {
  /** Login: 5 tentatives par minute */
  LOGIN: { ttl: 60000, limit: 5 },

  /** Refresh: 20 requêtes par minute */
  REFRESH: { ttl: 60000, limit: 20 },

  /** OTP: 3 demandes par minute */
  OTP: { ttl: 60000, limit: 3 },

  /** Vérification: 5 tentatives par minute */
  VERIFY: { ttl: 60000, limit: 5 },
} as const;

/**
 * Configuration des cookies
 */
export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
  },
} as const;

/**
 * Messages d'erreur standardisés
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Téléphone ou mot de passe incorrect',
  ACCOUNT_DISABLED: 'Votre compte a été désactivé. Contactez le support pour plus d\'informations.',
  REFRESH_TOKEN_MISSING: 'Refresh token manquant',
  REFRESH_TOKEN_INVALID: 'Refresh token invalide ou révoqué',
  USER_INVALID: 'Utilisateur invalide',
  INVALID_TOKEN: 'Token invalide',
} as const;
