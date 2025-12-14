import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from '../dto';

/**
 * Service de gestion des services proposés par les providers
 */
@Injectable()
export class ProviderServicesService {
  private readonly logger = new Logger(ProviderServicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un nouveau service
   */
  async create(providerId: number, dto: CreateServiceDto) {
    // Vérifier que la catégorie existe
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    const service = await this.prisma.service.create({
      data: {
        providerId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        duration: dto.duration,
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            icon: true,
            translations: {
              where: { locale: 'fr' },
              select: { name: true },
            },
          },
        },
      },
    });

    this.logger.log(`Service créé: ${service.id} pour provider ${providerId}`);

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration,
      isActive: service.isActive,
      category: {
        id: service.category.id,
        code: service.category.code,
        name: service.category.translations[0]?.name || service.category.code,
        icon: service.category.icon,
      },
      createdAt: service.createdAt,
    };
  }

  /**
   * Récupérer tous les services d'un provider
   */
  async findAllByProvider(providerId: number, includeInactive = false) {
    const services = await this.prisma.service.findMany({
      where: {
        providerId,
        isActive: includeInactive ? undefined : true,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            icon: true,
            displayOrder: true,
            translations: {
              where: { locale: 'fr' },
              select: { name: true },
            },
          },
        },
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { name: 'asc' },
      ],
    });

    return services.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price.toString(),
      duration: s.duration,
      isActive: s.isActive,
      category: {
        id: s.category.id,
        code: s.category.code,
        name: s.category.translations[0]?.name || s.category.code,
        icon: s.category.icon,
      },
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Récupérer un service spécifique
   */
  async findOne(serviceId: number, providerId: number) {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId,
        deletedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            icon: true,
            translations: {
              where: { locale: 'fr' },
              select: { name: true },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service non trouvé');
    }

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration,
      isActive: service.isActive,
      category: {
        id: service.category.id,
        code: service.category.code,
        name: service.category.translations[0]?.name || service.category.code,
        icon: service.category.icon,
      },
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Mettre à jour un service
   */
  async update(serviceId: number, providerId: number, dto: UpdateServiceDto) {
    // Vérifier que le service appartient au provider
    const existing = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Service non trouvé');
    }

    // Vérifier la catégorie si changée
    if (dto.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category || !category.isActive) {
        throw new NotFoundException('Catégorie non trouvée ou inactive');
      }
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        duration: dto.duration,
        isActive: dto.isActive,
      },
      include: {
        category: {
          select: {
            id: true,
            code: true,
            icon: true,
            translations: {
              where: { locale: 'fr' },
              select: { name: true },
            },
          },
        },
      },
    });

    this.logger.log(`Service ${serviceId} mis à jour`);

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration: service.duration,
      isActive: service.isActive,
      category: {
        id: service.category.id,
        code: service.category.code,
        name: service.category.translations[0]?.name || service.category.code,
        icon: service.category.icon,
      },
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Supprimer un service (soft delete)
   */
  async remove(serviceId: number, providerId: number) {
    // Vérifier que le service appartient au provider
    const existing = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        providerId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Service non trouvé');
    }

    await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    this.logger.log(`Service ${serviceId} supprimé`);

    return {
      message: 'Service supprimé avec succès',
    };
  }

  /**
   * Récupérer toutes les catégories actives avec traductions
   */
  async getCategories(locale: string = 'fr') {
    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        isActive: true,
        parentId: null, // Seulement catégories principales
      },
      include: {
        translations: {
          where: { locale },
        },
        children: {
          where: { isActive: true },
          include: {
            translations: {
              where: { locale },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return categories.map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.translations[0]?.name || c.code,
      description: c.translations[0]?.description || null,
      icon: c.icon,
      children: c.children.map((child: any) => ({
        id: child.id,
        code: child.code,
        name: child.translations[0]?.name || child.code,
        icon: child.icon,
      })),
    }));
  }
}
