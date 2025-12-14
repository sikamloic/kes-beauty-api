import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddSpecialtyDto, AddSpecialtiesBulkDto, UpdateSpecialtyDto } from '../dto';

/**
 * Service de gestion des spécialités provider
 */
@Injectable()
export class ProviderSpecialtiesService {
  private readonly logger = new Logger(ProviderSpecialtiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ajouter une spécialité
   */
  async add(providerId: number, dto: AddSpecialtyDto) {
    // Vérifier que la catégorie existe
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Catégorie non trouvée ou inactive');
    }

    // Vérifier si la spécialité existe déjà
    const existing = await this.prisma.providerSpecialty.findUnique({
      where: {
        providerId_categoryId: {
          providerId,
          categoryId: dto.categoryId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Cette spécialité existe déjà');
    }

    // Si isPrimary=true, retirer le flag des autres spécialités
    if (dto.isPrimary) {
      await this.prisma.providerSpecialty.updateMany({
        where: { providerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const specialty = await this.prisma.providerSpecialty.create({
      data: {
        providerId,
        categoryId: dto.categoryId,
        yearsExperience: dto.yearsExperience || 0,
        isPrimary: dto.isPrimary || false,
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

    this.logger.log(
      `Spécialité ajoutée: ${specialty.category.translations[0]?.name || specialty.category.code} pour provider ${providerId}`,
    );

    return {
      id: specialty.id,
      category: {
        id: specialty.category.id,
        code: specialty.category.code,
        name: specialty.category.translations[0]?.name || specialty.category.code,
        icon: specialty.category.icon,
      },
      yearsExperience: specialty.yearsExperience,
      isPrimary: specialty.isPrimary,
      createdAt: specialty.createdAt,
    };
  }

  /**
   * Ajouter plusieurs spécialités en bulk
   */
  async addBulk(providerId: number, dto: AddSpecialtiesBulkDto) {
    // Vérifier qu'il n'y a qu'une seule spécialité primary max
    const primaryCount = dto.specialties.filter((s) => s.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException(
        'Une seule spécialité peut être marquée comme principale',
      );
    }

    // Vérifier que toutes les catégories existent et sont actives
    const categoryIds = dto.specialties.map((s) => s.categoryId);
    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException(
        'Une ou plusieurs catégories sont invalides ou inactives',
      );
    }

    // Vérifier les doublons dans la requête
    const uniqueCategoryIds = new Set(categoryIds);
    if (uniqueCategoryIds.size !== categoryIds.length) {
      throw new BadRequestException('Catégories en double détectées');
    }

    // Vérifier les spécialités existantes
    const existingSpecialties = await this.prisma.providerSpecialty.findMany({
      where: {
        providerId,
        categoryId: { in: categoryIds },
        deletedAt: null,
      },
    });

    if (existingSpecialties.length > 0) {
      const existingCategoryIds = existingSpecialties.map((s) => s.categoryId);
      throw new ConflictException(
        `Spécialités déjà existantes: ${existingCategoryIds.join(', ')}`,
      );
    }

    // Si une spécialité est primary, retirer le flag des autres
    const hasPrimary = dto.specialties.some((s) => s.isPrimary);
    if (hasPrimary) {
      await this.prisma.providerSpecialty.updateMany({
        where: { providerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Créer toutes les spécialités en transaction
    const createdSpecialties = await this.prisma.$transaction(
      dto.specialties.map((specialty) =>
        this.prisma.providerSpecialty.create({
          data: {
            providerId,
            categoryId: specialty.categoryId,
            yearsExperience: specialty.yearsExperience || 0,
            isPrimary: specialty.isPrimary || false,
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
        }),
      ),
    );

    this.logger.log(
      `${createdSpecialties.length} spécialités ajoutées pour provider ${providerId}`,
    );

    return {
      count: createdSpecialties.length,
      specialties: createdSpecialties.map((s: any) => ({
        id: s.id,
        category: {
          id: s.category.id,
          code: s.category.code,
          name: s.category.translations[0]?.name || s.category.code,
          icon: s.category.icon,
        },
        yearsExperience: s.yearsExperience,
        isPrimary: s.isPrimary,
        createdAt: s.createdAt,
      })),
    };
  }

  /**
   * Liste des spécialités d'un provider
   */
  async findAll(providerId: number) {
    const specialties = await this.prisma.providerSpecialty.findMany({
      where: { 
        providerId,
        deletedAt: null, // Exclure les spécialités supprimées
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
            parent: {
              select: {
                id: true,
                code: true,
                translations: {
                  where: { locale: 'fr' },
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { yearsExperience: 'desc' }],
    });

    return specialties.map((s: any) => ({
      id: s.id,
      category: {
        id: s.category.id,
        code: s.category.code,
        name: s.category.translations[0]?.name || s.category.code,
        icon: s.category.icon,
        parent: s.category.parent
          ? {
              id: s.category.parent.id,
              code: s.category.parent.code,
              name: s.category.parent.translations[0]?.name || s.category.parent.code,
            }
          : null,
      },
      yearsExperience: s.yearsExperience,
      isPrimary: s.isPrimary,
      badge: this.getBadge(s.yearsExperience, s.isPrimary),
      createdAt: s.createdAt,
    }));
  }

  /**
   * Mettre à jour une spécialité
   */
  async update(specialtyId: number, providerId: number, dto: UpdateSpecialtyDto) {
    // Vérifier que la spécialité appartient au provider et n'est pas supprimée
    const existing = await this.prisma.providerSpecialty.findFirst({
      where: {
        id: specialtyId,
        providerId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Spécialité non trouvée');
    }

    // Si isPrimary=true, retirer le flag des autres spécialités
    if (dto.isPrimary) {
      await this.prisma.providerSpecialty.updateMany({
        where: {
          providerId,
          isPrimary: true,
          id: { not: specialtyId },
        },
        data: { isPrimary: false },
      });
    }

    const specialty = await this.prisma.providerSpecialty.update({
      where: { id: specialtyId },
      data: {
        yearsExperience: dto.yearsExperience,
        isPrimary: dto.isPrimary,
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

    this.logger.log(`Spécialité ${specialtyId} mise à jour`);

    return {
      id: specialty.id,
      category: {
        id: specialty.category.id,
        code: specialty.category.code,
        name: specialty.category.translations[0]?.name || specialty.category.code,
        icon: specialty.category.icon,
      },
      yearsExperience: specialty.yearsExperience,
      isPrimary: specialty.isPrimary,
      badge: this.getBadge(specialty.yearsExperience, specialty.isPrimary),
    };
  }

  /**
   * Supprimer une spécialité (soft delete)
   */
  async remove(specialtyId: number, providerId: number) {
    // Vérifier que la spécialité appartient au provider et n'est pas déjà supprimée
    const existing = await this.prisma.providerSpecialty.findFirst({
      where: {
        id: specialtyId,
        providerId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Spécialité non trouvée');
    }

    // Soft delete: marquer comme supprimée
    await this.prisma.providerSpecialty.update({
      where: { id: specialtyId },
      data: {
        deletedAt: new Date(),
        isPrimary: false, // Retirer le flag primary si présent
      },
    });

    this.logger.log(`Spécialité ${specialtyId} supprimée (soft delete)`);

    return {
      message: 'Spécialité supprimée avec succès',
    };
  }

  /**
   * Obtenir le badge selon expérience
   */
  private getBadge(yearsExperience: number, isPrimary: boolean): string {
    if (isPrimary && yearsExperience >= 10) {
      return 'Expert Certifié';
    }
    if (isPrimary && yearsExperience >= 5) {
      return 'Spécialiste Certifié';
    }
    if (yearsExperience >= 10) {
      return 'Expert';
    }
    if (yearsExperience >= 5) {
      return 'Spécialiste';
    }
    if (yearsExperience >= 2) {
      return 'Confirmé';
    }
    return 'Débutant';
  }
}
