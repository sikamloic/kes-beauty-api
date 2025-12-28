/**
 * Helper pour le formatage des réponses provider
 * 
 * Centralise la transformation des données Prisma en DTOs de réponse
 * pour éviter la duplication de code (DRY)
 */

/**
 * Formate les statistiques d'un provider
 */
export const formatStatistics = (
  statistics: {
    averageRating?: any;
    totalReviews?: number;
    totalBookings?: number;
    totalCompleted?: number;
  } | null,
  includeBookings = false,
) => {
  if (!statistics) {
    return {
      averageRating: '0.00',
      totalReviews: 0,
      ...(includeBookings ? { totalBookings: 0 } : {}),
      totalCompleted: 0,
    };
  }

  return {
    averageRating: statistics.averageRating?.toString() || '0.00',
    totalReviews: statistics.totalReviews || 0,
    ...(includeBookings ? { totalBookings: statistics.totalBookings || 0 } : {}),
    totalCompleted: statistics.totalCompleted || 0,
  };
};

/**
 * Formate les statistiques simplifiées (pour les listes)
 */
export const formatStatisticsSimple = (
  statistics: {
    averageRating?: any;
    totalReviews?: number;
  } | null,
) => ({
  averageRating: statistics?.averageRating?.toString() || '0.00',
  totalReviews: statistics?.totalReviews || 0,
});

/**
 * Formate un businessType avec traductions
 */
export const formatBusinessType = (
  businessType: {
    id: number;
    code: string;
    translations?: { label?: string; description?: string | null }[];
  } | null,
  includeDescription = false,
) => {
  if (!businessType) return null;

  const translation = businessType.translations?.[0];
  return {
    id: businessType.id,
    code: businessType.code,
    label: translation?.label || businessType.code,
    ...(includeDescription && translation?.description
      ? { description: translation.description }
      : {}),
  };
};

/**
 * Formate les coordonnées GPS
 */
export const formatCoordinates = (
  latitude: any | null,
  longitude: any | null,
) => {
  if (!latitude || !longitude) return null;
  return {
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  };
};

/**
 * Formate une spécialité avec catégorie traduite
 */
export const formatSpecialty = (
  specialty: {
    id: number;
    yearsExperience: number;
    isPrimary: boolean;
    category: {
      id: number;
      code: string;
      translations?: { name?: string }[];
    };
  },
  detailed = false,
) => {
  const categoryName =
    specialty.category.translations?.[0]?.name || specialty.category.code;

  if (detailed) {
    return {
      id: specialty.id,
      categoryId: specialty.category.id,
      name: categoryName,
      yearsExperience: specialty.yearsExperience,
      isPrimary: specialty.isPrimary,
    };
  }

  return {
    id: specialty.category.id,
    name: categoryName,
  };
};

/**
 * Formate une liste de spécialités
 */
export const formatSpecialties = (
  specialties: Array<{
    id: number;
    yearsExperience: number;
    isPrimary: boolean;
    category: {
      id: number;
      code: string;
      translations?: { name?: string }[];
    };
  }>,
  detailed = false,
) => specialties.map((s) => formatSpecialty(s, detailed));

/**
 * Formate un service
 */
export const formatService = (service: {
  id: number;
  name: string;
  description: string | null;
  price: any;
  duration: number;
}) => ({
  id: service.id,
  name: service.name,
  description: service.description,
  price: service.price.toString(),
  duration: service.duration,
});

/**
 * Formate la bio avec troncature optionnelle
 */
export const formatBio = (bio: string | null, maxLength?: number) => {
  if (!bio) return null;
  if (!maxLength || bio.length <= maxLength) return bio;
  return bio.substring(0, maxLength) + '...';
};

/**
 * Formate la pagination
 */
export const formatPagination = (
  page: number,
  limit: number,
  total: number,
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
