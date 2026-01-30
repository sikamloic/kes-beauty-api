import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchProvidersDto, ProviderSortBy, PublicAvailabilityDto } from '../dto';
import { NotFoundException } from '../../common';
import {
  activeProviderWhere,
  activeProviderByIdWhere,
  formatStatistics,
  formatBusinessType,
  formatCoordinates,
  formatSpecialties,
  formatBio,
  formatPagination,
} from '../helpers';

/**
 * Service de recherche de providers (SRP)
 * 
 * Responsabilité unique: Recherche et consultation des providers
 * - Recherche avec filtres
 * - Détails d'un provider
 * - Services d'un provider
 * - Disponibilités d'un provider
 * - Providers populaires/nearby
 */
@Injectable()
export class ProviderSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rechercher des providers avec filtres
   */
  async searchProviders(filters: SearchProvidersDto) {
    const {
      query,
      city,
      neighborhood,
      categoryId,
      businessTypeId,
      minPrice,
      maxPrice,
      minRating,
      latitude,
      longitude,
      radius = 10,
      availableNow,
      homeService,
      isVerified,
      sortBy = ProviderSortBy.RATING,
      page = 1,
      limit = 10,
    } = filters;

    // Si recherche géographique avec tri par distance, utiliser requête SQL optimisée
    if (latitude && longitude && sortBy === ProviderSortBy.DISTANCE) {
      return this.searchProvidersWithDistance(filters);
    }

    const skip = (page - 1) * limit;

    // Construction des conditions WHERE (base: provider actif)
    const where: any = { ...activeProviderWhere };

    // Filtre par ville
    if (city) {
      where.city = city;
    }

    // Filtre par quartier
    if (neighborhood) {
      where.neighborhood = {
        contains: neighborhood,
      };
    }

    // Filtre par type de business
    if (businessTypeId) {
      where.businessTypeId = businessTypeId;
    }

    // Filtre par catégorie (via spécialités)
    if (categoryId) {
      where.specialties = {
        some: {
          categoryId,
          deletedAt: null,
        },
      };
    }

    // Filtre par note minimum
    if (minRating) {
      where.statistics = {
        averageRating: {
          gte: minRating,
        },
      };
    }

    // Recherche textuelle
    if (query) {
      where.OR = [
        { businessName: { contains: query } },
        { bio: { contains: query } },
        {
          services: {
            some: {
              name: { contains: query },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      ];
    }

    // Filtre par prix (via services)
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: any = {};
      if (minPrice !== undefined) priceFilter.gte = minPrice;
      if (maxPrice !== undefined) priceFilter.lte = maxPrice;

      where.services = {
        some: {
          price: priceFilter,
          isActive: true,
          deletedAt: null,
        },
      };
    }

    // Filtre par service à domicile
    if (homeService === true) {
      where.serviceSettings = {
        offersHomeService: true,
      };
    }

    // Filtre par provider vérifié (identité)
    if (isVerified === true) {
      where.verification = {
        ...where.verification,
        identityVerified: true,
      };
    }

    // Filtre par rayon géographique (sans tri par distance)
    if (latitude && longitude && radius) {
      const providerIdsInRadius = await this.getProviderIdsInRadius(latitude, longitude, radius);
      if (providerIdsInRadius.length === 0) {
        return {
          providers: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      where.id = { in: providerIdsInRadius };
    }

    // Filtre availableNow AVANT pagination (via sous-requête)
    const now = new Date();
    const today = now.toISOString().split('T')[0] as string;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (availableNow === true) {
      const availableProviderIds = await this.getAvailableNowProviderIds(today, currentMinutes);
      if (availableProviderIds.length === 0) {
        return {
          providers: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      // Combiner avec le filtre existant si présent
      if (where.id?.in) {
        where.id.in = where.id.in.filter((id: number) => availableProviderIds.includes(id));
      } else {
        where.id = { in: availableProviderIds };
      }
    }

    // Définir l'ordre de tri
    let orderBy: any = {};
    switch (sortBy) {
      case ProviderSortBy.RATING:
        orderBy = { statistics: { averageRating: 'desc' } };
        break;
      case ProviderSortBy.POPULARITY:
        orderBy = { statistics: { totalBookings: 'desc' } };
        break;
      case ProviderSortBy.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      case ProviderSortBy.PRICE:
        orderBy = [
          { services: { _min: { price: 'asc' } } },
          { statistics: { averageRating: 'desc' } },
        ];
        break;
      default:
        orderBy = { statistics: { averageRating: 'desc' } };
    }

    // Exécuter la requête
    const [providers, total] = await Promise.all([
      this.prisma.providerProfile.findMany({
        where,
        include: {
          user: {
            select: {
              phone: true,
            },
          },
          businessType: {
            include: {
              translations: true,
            },
          },
          statistics: true,
          specialties: {
            where: { deletedAt: null },
            include: {
              category: {
                include: {
                  translations: true,
                },
              },
            },
            take: 3,
          },
          services: {
            where: { isActive: true, deletedAt: null },
            select: {
              price: true,
            },
            orderBy: { price: 'asc' },
            take: 1,
          },
          serviceSettings: {
            select: {
              offersHomeService: true,
            },
          },
          verification: {
            select: {
              identityVerified: true,
            },
          },
          availabilities: {
            where: {
              date: new Date(today),
              isAvailable: true,
            },
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.providerProfile.count({ where }),
    ]);

    // Formater les résultats
    const formattedProviders = providers.map((provider: any) => ({
      id: provider.id,
      businessName: provider.businessName,
      bio: formatBio(provider.bio, 150),
      city: provider.city,
      neighborhood: provider.neighborhood,
      yearsExperience: provider.yearsExperience,
      businessType: formatBusinessType(provider.businessType),
      statistics: formatStatistics(provider.statistics),
      specialties: formatSpecialties(provider.specialties),
      startingPrice: provider.services[0]?.price?.toString() || null,
      coordinates: formatCoordinates(provider.latitude, provider.longitude),
      isAvailableNow: this.checkAvailableNow(provider.availabilities || [], currentMinutes),
      homeService: provider.serviceSettings?.offersHomeService || false,
      isVerified: provider.verification?.identityVerified || false,
    }));

    return {
      providers: formattedProviders,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Recherche avec tri par distance (requête SQL optimisée)
   */
  private async searchProvidersWithDistance(filters: SearchProvidersDto) {
    const {
      latitude,
      longitude,
      radius = 10,
      city,
      neighborhood,
      categoryId,
      businessTypeId,
      minRating,
      availableNow,
      homeService,
      isVerified,
      page = 1,
      limit = 10,
    } = filters;

    if (!latitude || !longitude) {
      throw new NotFoundException('Latitude et longitude requises pour le tri par distance');
    }

    const skip = (page - 1) * limit;
    const now = new Date();
    const today = now.toISOString().split('T')[0] as string;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Construire les conditions SQL dynamiquement
    const conditions: string[] = [
      'pp.deleted_at IS NULL',
      'pv.status = "approved"',
      'u.is_active = 1',
      'u.deleted_at IS NULL',
      'pp.latitude IS NOT NULL',
      'pp.longitude IS NOT NULL',
    ];
    const params: any[] = [latitude, longitude, latitude];

    if (city) {
      conditions.push('pp.city = ?');
      params.push(city);
    }

    if (neighborhood) {
      conditions.push('pp.neighborhood LIKE ?');
      params.push(`%${neighborhood}%`);
    }

    if (businessTypeId) {
      conditions.push('pp.business_type_id = ?');
      params.push(businessTypeId);
    }

    if (minRating) {
      conditions.push('ps.average_rating >= ?');
      params.push(minRating);
    }

    if (homeService) {
      conditions.push('pss.offers_home_service = 1');
    }

    if (isVerified) {
      conditions.push('pv.identity_verified = 1');
    }

    // Requête SQL avec calcul de distance Haversine
    const baseQuery = `
      SELECT 
        pp.id,
        pp.business_name as businessName,
        pp.bio,
        pp.city,
        pp.neighborhood,
        pp.years_experience as yearsExperience,
        pp.latitude,
        pp.longitude,
        ps.average_rating as averageRating,
        ps.total_reviews as totalReviews,
        ps.total_bookings as totalBookings,
        pss.offers_home_service as offersHomeService,
        pv.identity_verified as identityVerified,
        (
          6371 * acos(
            cos(radians(?)) * cos(radians(pp.latitude)) *
            cos(radians(pp.longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(pp.latitude))
          )
        ) AS distance
      FROM provider_profiles pp
      INNER JOIN provider_verifications pv ON pv.provider_id = pp.id
      INNER JOIN users u ON u.id = pp.user_id
      LEFT JOIN provider_statistics ps ON ps.provider_id = pp.id
      LEFT JOIN provider_service_settings pss ON pss.provider_id = pp.id
      WHERE ${conditions.join(' AND ')}
      HAVING distance <= ?
      ORDER BY distance ASC
    `;

    params.push(radius);

    // Exécuter la requête pour obtenir tous les résultats (pour le count)
    const allProviders = await this.prisma.$queryRawUnsafe<any[]>(baseQuery, ...params);

    // Filtrer par availableNow si nécessaire
    let filteredProviders = allProviders;
    if (availableNow) {
      const availableIds = await this.getAvailableNowProviderIds(today, currentMinutes);
      filteredProviders = allProviders.filter((p) => availableIds.includes(p.id));
    }

    // Filtrer par catégorie si nécessaire (relation many-to-many)
    if (categoryId) {
      const providerIdsWithCategory = await this.prisma.providerSpecialty.findMany({
        where: { categoryId, deletedAt: null },
        select: { providerId: true },
      });
      const categoryProviderIds = providerIdsWithCategory.map((p) => p.providerId);
      filteredProviders = filteredProviders.filter((p) => categoryProviderIds.includes(p.id));
    }

    const total = filteredProviders.length;

    // Appliquer pagination
    const paginatedProviders = filteredProviders.slice(skip, skip + limit);

    // Enrichir avec les données manquantes (spécialités, services, etc.)
    const enrichedProviders = await this.enrichProvidersWithDetails(
      paginatedProviders.map((p) => p.id),
      today,
      currentMinutes,
    );

    // Fusionner les données de distance
    const formattedProviders = paginatedProviders.map((p) => {
      const enriched = enrichedProviders.find((e) => e.id === p.id);
      return {
        id: p.id,
        businessName: p.businessName,
        bio: formatBio(p.bio, 150),
        city: p.city,
        neighborhood: p.neighborhood,
        yearsExperience: p.yearsExperience,
        businessType: enriched?.businessType || null,
        statistics: {
          averageRating: p.averageRating?.toString() || '0.00',
          totalReviews: p.totalReviews || 0,
          totalBookings: p.totalBookings || 0,
        },
        specialties: enriched?.specialties || [],
        startingPrice: enriched?.startingPrice || null,
        coordinates: formatCoordinates(p.latitude, p.longitude),
        distance: Math.round(p.distance * 10) / 10,
        isAvailableNow: enriched?.isAvailableNow || false,
        homeService: !!p.offersHomeService,
        isVerified: !!p.identityVerified,
      };
    });

    return {
      providers: formattedProviders,
      pagination: formatPagination(page, limit, total),
    };
  }

  /**
   * Récupérer les IDs des providers dans un rayon donné
   */
  private async getProviderIdsInRadius(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<number[]> {
    const results = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT pp.id
      FROM provider_profiles pp
      INNER JOIN provider_verifications pv ON pv.provider_id = pp.id AND pv.status = 'approved'
      INNER JOIN users u ON u.id = pp.user_id AND u.is_active = 1 AND u.deleted_at IS NULL
      WHERE pp.deleted_at IS NULL
        AND pp.latitude IS NOT NULL
        AND pp.longitude IS NOT NULL
        AND (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(pp.latitude)) *
            cos(radians(pp.longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(pp.latitude))
          )
        ) <= ${radiusKm}
    `;
    return results.map((r) => r.id);
  }

  /**
   * Récupérer les IDs des providers disponibles maintenant
   */
  private async getAvailableNowProviderIds(
    today: string,
    currentMinutes: number,
  ): Promise<number[]> {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

    const results = await this.prisma.$queryRaw<{ provider_id: number }[]>`
      SELECT DISTINCT pa.provider_id
      FROM provider_availabilities pa
      INNER JOIN provider_profiles pp ON pp.id = pa.provider_id AND pp.deleted_at IS NULL
      INNER JOIN provider_verifications pv ON pv.provider_id = pp.id AND pv.status = 'approved'
      INNER JOIN users u ON u.id = pp.user_id AND u.is_active = 1 AND u.deleted_at IS NULL
      WHERE pa.date = ${today}
        AND pa.is_available = 1
        AND pa.start_time <= ${currentTime}
        AND pa.end_time > ${currentTime}
    `;
    return results.map((r) => r.provider_id);
  }

  /**
   * Vérifier si un provider est disponible maintenant
   */
  private checkAvailableNow(
    availabilities: { startTime: Date; endTime: Date }[],
    currentMinutes: number,
  ): boolean {
    if (availabilities.length === 0) return false;

    return availabilities.some((slot) => {
      const startMinutes = slot.startTime.getHours() * 60 + slot.startTime.getMinutes();
      const endMinutes = slot.endTime.getHours() * 60 + slot.endTime.getMinutes();
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    });
  }

  /**
   * Enrichir les providers avec leurs détails
   */
  private async enrichProvidersWithDetails(
    providerIds: number[],
    today: string,
    currentMinutes: number,
  ): Promise<any[]> {
    if (providerIds.length === 0) return [];

    const providers = await this.prisma.providerProfile.findMany({
      where: { id: { in: providerIds } },
      include: {
        businessType: {
          include: { translations: true },
        },
        specialties: {
          where: { deletedAt: null },
          include: {
            category: {
              include: { translations: true },
            },
          },
          take: 3,
        },
        services: {
          where: { isActive: true, deletedAt: null },
          select: { price: true },
          orderBy: { price: 'asc' },
          take: 1,
        },
        availabilities: {
          where: {
            date: new Date(today),
            isAvailable: true,
          },
          select: {
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    return providers.map((p: any) => ({
      id: p.id,
      businessType: formatBusinessType(p.businessType),
      specialties: formatSpecialties(p.specialties),
      startingPrice: p.services[0]?.price?.toString() || null,
      isAvailableNow: this.checkAvailableNow(p.availabilities || [], currentMinutes),
    }));
  }

  /**
   * Récupérer les détails d'un provider (vue publique)
   */
  async getProviderDetails(providerId: number, locale: string = 'fr') {
    const provider = await this.prisma.providerProfile.findFirst({
      where: activeProviderByIdWhere(providerId),
      include: {
        user: {
          select: {
            phone: true,
            phoneVerifiedAt: true,
          },
        },
        businessType: {
          include: {
            translations: {
              where: { locale },
            },
          },
        },
        statistics: true,
        specialties: {
          where: { deletedAt: null },
          include: {
            category: {
              include: {
                translations: {
                  where: { locale },
                },
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { yearsExperience: 'desc' }],
        },
        verification: {
          select: {
            phoneVerified: true,
            identityVerified: true,
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider non trouvé ou non disponible');
    }

    return {
      id: provider.id,
      businessName: provider.businessName,
      bio: provider.bio,
      yearsExperience: provider.yearsExperience,
      city: provider.city,
      neighborhood: provider.neighborhood,
      address: provider.address,
      coordinates: formatCoordinates(provider.latitude, provider.longitude),
      phone: provider.user.phone,
      phoneVerified: !!provider.user.phoneVerifiedAt,
      businessType: formatBusinessType(provider.businessType, true),
      statistics: formatStatistics(provider.statistics, true),
      specialties: formatSpecialties(provider.specialties, true),
      verification: {
        phoneVerified: provider.verification?.phoneVerified || false,
        identityVerified: provider.verification?.identityVerified || false,
      },
      createdAt: provider.createdAt,
    };
  }

  /**
   * Récupérer les services d'un provider (vue publique)
   */
  async getProviderServices(providerId: number, locale: string = 'fr') {
    // Vérifier que le provider existe et est validé
    const provider = await this.prisma.providerProfile.findFirst({
      where: activeProviderByIdWhere(providerId),
      select: { id: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider non trouvé ou non disponible');
    }

    const services = await this.prisma.service.findMany({
      where: {
        providerId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        category: {
          include: {
            translations: {
              where: { locale },
            },
          },
        },
      },
      orderBy: [{ category: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    // Grouper par catégorie
    const servicesByCategory = new Map<number, any>();

    services.forEach((service) => {
      const categoryId = service.category.id;
      if (!servicesByCategory.has(categoryId)) {
        servicesByCategory.set(categoryId, {
          category: {
            id: service.category.id,
            code: service.category.code,
            name: service.category.translations[0]?.name || service.category.code,
          },
          services: [],
        });
      }

      servicesByCategory.get(categoryId).services.push({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price.toString(),
        duration: service.duration,
      });
    });

    return {
      providerId,
      totalServices: services.length,
      categories: Array.from(servicesByCategory.values()),
    };
  }

  /**
   * Récupérer les disponibilités d'un provider (vue publique)
   */
  async getProviderAvailability(
    providerId: number,
    filters: PublicAvailabilityDto,
  ) {
    // Vérifier que le provider existe et est validé
    const provider = await this.prisma.providerProfile.findFirst({
      where: activeProviderByIdWhere(providerId),
      select: { id: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider non trouvé ou non disponible');
    }

    // Définir la plage de dates (défaut: 7 prochains jours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = filters.startDate ? new Date(filters.startDate) : today;
    const endDate = filters.endDate
      ? new Date(filters.endDate)
      : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Récupérer les créneaux disponibles
    const availabilities = await this.prisma.providerAvailability.findMany({
      where: {
        providerId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isAvailable: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Récupérer les RDV existants pour exclure les créneaux occupés
    const appointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['pending', 'confirmed', 'in_progress'],
        },
      },
      select: {
        scheduledAt: true,
        endAt: true,
        durationMinutes: true,
      },
    });

    // Si un serviceId est fourni, récupérer sa durée
    let serviceDuration = 60;
    if (filters.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: {
          id: filters.serviceId,
          providerId,
          isActive: true,
          deletedAt: null,
        },
      });
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Grouper par date et calculer les créneaux libres
    const availabilityByDate = new Map<string, any[]>();

    availabilities.forEach((slot) => {
      const dateKey = slot.date.toISOString().split('T')[0] as string;
      if (!availabilityByDate.has(dateKey)) {
        availabilityByDate.set(dateKey, []);
      }

      // Vérifier si le créneau n'est pas occupé par un RDV
      const slotStart = new Date(`${dateKey}T${slot.startTime.toISOString().split('T')[1]}`);
      const slotEnd = new Date(`${dateKey}T${slot.endTime.toISOString().split('T')[1]}`);

      const isOccupied = appointments.some((apt) => {
        const aptStart = new Date(apt.scheduledAt);
        const aptEnd = apt.endAt ? new Date(apt.endAt) : new Date(aptStart.getTime() + apt.durationMinutes * 60000);
        return aptStart < slotEnd && aptEnd > slotStart;
      });

      if (!isOccupied) {
        availabilityByDate.get(dateKey)?.push({
          startTime: slot.startTime.toISOString().split('T')[1]?.substring(0, 5),
          endTime: slot.endTime.toISOString().split('T')[1]?.substring(0, 5),
        });
      }
    });

    // Convertir en tableau
    const result = Array.from(availabilityByDate.entries()).map(([date, slots]) => ({
      date,
      slots,
      slotsCount: slots.length,
    }));

    return {
      providerId,
      serviceDuration,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      availability: result,
    };
  }

  /**
   * Récupérer les providers populaires
   */
  async getPopularProviders(city?: string, limit: number = 10) {
    const where: any = {
      ...activeProviderWhere,
      statistics: {
        totalCompleted: {
          gt: 0,
        },
      },
    };

    if (city) {
      where.city = city;
    }

    const providers = await this.prisma.providerProfile.findMany({
      where,
      include: {
        businessType: {
          include: {
            translations: true,
          },
        },
        statistics: true,
        specialties: {
          where: { deletedAt: null, isPrimary: true },
          include: {
            category: {
              include: {
                translations: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: {
        statistics: {
          averageRating: 'desc',
        },
      },
      take: limit,
    });

    return providers.map((provider) => ({
      id: provider.id,
      businessName: provider.businessName,
      city: provider.city,
      neighborhood: provider.neighborhood,
      businessType: formatBusinessType(provider.businessType),
      primarySpecialty: provider.specialties[0]
        ? {
            name: provider.specialties[0].category.translations[0]?.name || provider.specialties[0].category.code,
          }
        : null,
      statistics: formatStatistics(provider.statistics),
    }));
  }

  /**
   * Récupérer les providers à proximité
   */
  async getNearbyProviders(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
  ) {
    const providers = await this.prisma.$queryRaw<any[]>`
      SELECT 
        pp.id,
        pp.business_name as businessName,
        pp.city,
        pp.neighborhood,
        pp.latitude,
        pp.longitude,
        ps.average_rating as averageRating,
        ps.total_reviews as totalReviews,
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(pp.latitude)) *
            cos(radians(pp.longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(pp.latitude))
          )
        ) AS distance
      FROM provider_profiles pp
      INNER JOIN provider_verifications pv ON pv.provider_id = pp.id AND pv.status = 'approved'
      INNER JOIN users u ON u.id = pp.user_id AND u.is_active = 1 AND u.deleted_at IS NULL
      LEFT JOIN provider_statistics ps ON ps.provider_id = pp.id
      WHERE pp.deleted_at IS NULL
        AND pp.latitude IS NOT NULL
        AND pp.longitude IS NOT NULL
      HAVING distance <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      city: p.city,
      neighborhood: p.neighborhood,
      coordinates: formatCoordinates(p.latitude, p.longitude),
      distance: Math.round(p.distance * 10) / 10,
      statistics: {
        averageRating: p.averageRating?.toString() || '0.00',
        totalReviews: p.totalReviews || 0,
      },
    }));
  }
}
