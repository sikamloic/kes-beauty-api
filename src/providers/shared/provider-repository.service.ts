import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository Provider
 * 
 * Principe SOLID:
 * - SRP: Accès données provider uniquement
 * - Utilisé par: Tous les services provider
 * - Centralise les requêtes DB
 */
@Injectable()
export class ProviderRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupérer un provider par ID avec relations
   */
  async findById(id: number) {
    return this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
        verification: true,
        statistics: true,
        serviceSettings: true,
      },
    });
  }

  /**
   * Récupérer un provider par userId
   */
  async findByUserId(userId: number) {
    return this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        verification: true,
      },
    });
  }

  /**
   * Mettre à jour un provider
   */
  async update(id: number, data: Prisma.ProviderProfileUpdateInput) {
    return this.prisma.providerProfile.update({
      where: { id },
      data,
    });
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(providerId: number) {
    return this.prisma.providerStatistics.findUnique({
      where: { providerId },
    });
  }

  /**
   * Récupérer la vérification
   */
  async getVerification(providerId: number) {
    return this.prisma.providerVerification.findUnique({
      where: { providerId },
    });
  }

  /**
   * Mettre à jour les statistiques
   */
  async updateStatistics(
    providerId: number,
    data: Prisma.ProviderStatisticsUpdateInput,
  ) {
    return this.prisma.providerStatistics.update({
      where: { providerId },
      data,
    });
  }
}
