/**
 * Helper pour les requêtes provider
 * 
 * Centralise les conditions WHERE et les includes Prisma
 * pour éviter la duplication de code (DRY)
 */

/**
 * Conditions WHERE pour un provider actif et validé
 * Utilisé dans toutes les requêtes de recherche publique
 */
export const activeProviderWhere = {
  deletedAt: null,
  verification: {
    status: 'approved',
  },
  user: {
    isActive: true,
    deletedAt: null,
  },
};

/**
 * Conditions WHERE pour un provider par ID (actif et validé)
 */
export const activeProviderByIdWhere = (providerId: number) => ({
  id: providerId,
  ...activeProviderWhere,
});

/**
 * Include standard pour les traductions avec locale
 */
export const translationsInclude = (locale: string) => ({
  translations: {
    where: { locale },
  },
});

/**
 * Include pour businessType avec traductions
 */
export const businessTypeInclude = (locale?: string) => ({
  businessType: {
    include: locale
      ? translationsInclude(locale)
      : { translations: true },
  },
});

/**
 * Include pour les statistiques
 */
export const statisticsInclude = {
  statistics: true,
};

/**
 * Include pour les spécialités avec catégories traduites
 */
export const specialtiesInclude = (locale?: string, limit?: number) => ({
  specialties: {
    where: { deletedAt: null },
    include: {
      category: {
        include: locale
          ? translationsInclude(locale)
          : { translations: true },
      },
    },
    ...(limit ? { take: limit } : {}),
  },
});

/**
 * Include pour les services actifs
 */
export const activeServicesInclude = (options?: { 
  select?: Record<string, boolean>;
  orderBy?: Record<string, string>;
  take?: number;
}) => ({
  services: {
    where: { isActive: true, deletedAt: null },
    ...(options?.select ? { select: options.select } : {}),
    ...(options?.orderBy ? { orderBy: options.orderBy } : {}),
    ...(options?.take ? { take: options.take } : {}),
  },
});
