import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProvidersDto, ProviderSortBy, PublicAvailabilityDto, RegisterClientDto } from './dto';
import { NotFoundException, PhoneValidationService, JwtTokenService } from '../common';
import { RefreshTokenService } from '../auth';
import * as bcrypt from 'bcrypt';
import {
  activeProviderWhere,
  activeProviderByIdWhere,
  formatStatistics,
  formatBusinessType,
  formatCoordinates,
  formatSpecialties,
  formatBio,
  formatPagination,
} from './helpers';

/**
 * Service Client
 * 
 * Gère les fonctionnalités pour les clients :
 * - Inscription client
 * - Recherche de providers
 * - Consultation des profils providers
 * - Consultation des services
 * - Consultation des disponibilités
 */
@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,
    private readonly jwtToken: JwtTokenService,
    private readonly refreshToken: RefreshTokenService,
  ) {}

  // ==================== INSCRIPTION ====================

  /**
   * Inscription client
   * 
   * Crée un compte client avec:
   * - User (téléphone, mot de passe)
   * - ClientProfile (nom)
   * - Attribution du rôle 'client'
   */
  async register(dto: RegisterClientDto) {
    const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
    
    await this.ensurePhoneIsUnique(normalizedPhone);
    
    const passwordHash = await this.hashPassword(dto.password);
    
    const result = await this.createClientInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });

    this.logger.log(`Client créé: ID=${result.clientId}`);

    // Générer JWT tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: result.userId,
      role: 'client',
      clientId: result.clientId,
    });

    // Stocker refresh token en BD
    await this.storeRefreshToken(result.userId, tokens.refreshToken);

    return this.buildRegistrationResponse(result, dto, tokens);
  }

  /**
   * Valider et normaliser le téléphone
   */
  private validateAndNormalizePhone(phone: string): string {
    return this.phoneValidation.validateAndNormalize(phone);
  }

  /**
   * Vérifier unicité du téléphone
   */
  private async ensurePhoneIsUnique(phone: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }
  }

  /**
   * Hasher le mot de passe
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Créer le client en transaction
   */
  private async createClientInTransaction(data: {
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
    email?: string;
  }) {
    const skipVerification = process.env.SKIP_PHONE_VERIFICATION === 'true';
    
    return this.prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      // En mode dev (SKIP_PHONE_VERIFICATION=true), le compte est activé directement
      const user = await tx.user.create({
        data: {
          phone: data.phone,
          email: data.email || null,
          passwordHash: data.passwordHash,
          isActive: skipVerification, // Activé directement en mode dev
          phoneVerifiedAt: skipVerification ? new Date() : null,
        },
      });

      // Attribuer le rôle client
      const clientRole = await tx.role.findUnique({
        where: { code: 'client' },
      });

      if (!clientRole) {
        throw new Error('Rôle client introuvable');
      }

      await tx.userRole.create({
        data: { userId: user.id, roleId: clientRole.id },
      });

      // Créer le profil client
      const clientProfile = await tx.clientProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName || null,
        },
      });

      return {
        userId: user.id,
        clientId: clientProfile.id,
        phone: user.phone,
        firstName: data.firstName,
        lastName: data.lastName,
      };
    });
  }

  /**
   * Stocker refresh token en BD
   */
  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshToken.create({
      token,
      userId,
      expiresAt,
    });
  }

  /**
   * Construire la réponse d'inscription
   */
  private buildRegistrationResponse(
    result: { userId: number; clientId: number; phone: string; firstName: string; lastName?: string },
    _dto: RegisterClientDto,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ) {
    return {
      user: {
        clientId: result.clientId,
        firstName: result.firstName,
        lastName: result.lastName || null,
        phone: result.phone,
        status: 'pending_verification',
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      message:
        'Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS.',
    };
  }

  // ==================== RECHERCHE ====================

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
      sortBy,
      page = 1,
      limit = 10,
    } = filters;

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
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.providerProfile.count({ where }),
    ]);

    // Formater les résultats avec les helpers
    const formattedProviders = providers.map((provider) => ({
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
    }));

    return {
      providers: formattedProviders,
      pagination: formatPagination(page, limit, total),
    };
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
    let serviceDuration = 60; // Défaut 1h
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
    // Utiliser une requête SQL brute pour le calcul de distance (Haversine)
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
