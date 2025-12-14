/**
 * Barrel export pour toutes les exceptions custom
 * Principe SOLID: Facilite l'import et respecte DIP (dépendance sur abstractions)
 */

// Base
export * from './base.exception';

// Business exceptions
export * from './business.exception';

// Technical exceptions
export * from './technical.exception';

// Prisma exceptions
export * from './prisma.exception';
