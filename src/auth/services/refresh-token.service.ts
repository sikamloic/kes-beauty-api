import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Service de gestion des refresh tokens
 * SRP: Gestion stockage et révocation tokens uniquement
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hasher un token pour stockage sécurisé
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Créer et stocker un refresh token
   */
  async create(data: {
    token: string;
    userId: number;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    this.logger.debug(`Création refresh token pour user ${data.userId}`);

    // Hasher le token avant stockage
    const hashedToken = this.hashToken(data.token);

    return this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId: data.userId,
        expiresAt: data.expiresAt,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
      },
    });
  }

  /**
   * Vérifier si un token existe et est valide
   */
  async verify(token: string): Promise<boolean> {
    // Hasher le token pour comparaison
    const hashedToken = this.hashToken(token);

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    if (!refreshToken) {
      this.logger.warn('Token non trouvé en BD');
      return false;
    }

    if (refreshToken.isRevoked) {
      this.logger.warn(`Token révoqué: ${refreshToken.id}`);
      return false;
    }

    if (refreshToken.expiresAt < new Date()) {
      this.logger.warn(`Token expiré: ${refreshToken.id}`);
      return false;
    }

    // Mettre à jour lastUsedAt
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  /**
   * Révoquer un token spécifique
   */
  async revoke(token: string): Promise<void> {
    try {
      // Hasher le token pour recherche
      const hashedToken = this.hashToken(token);

      await this.prisma.refreshToken.update({
        where: { token: hashedToken },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });

      this.logger.log(`Token révoqué`);
    } catch (error) {
      this.logger.warn(`Impossible de révoquer token: ${error}`);
    }
  }

  /**
   * Révoquer tous les tokens d'un utilisateur
   */
  async revokeAllForUser(userId: number): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    this.logger.log(
      `${result.count} tokens révoqués pour utilisateur ${userId}`,
    );

    return result.count;
  }

  /**
   * Supprimer les tokens expirés (cleanup)
   */
  async deleteExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`${result.count} tokens expirés supprimés`);

    return result.count;
  }

  /**
   * Limiter le nombre de tokens par utilisateur
   * Supprime les plus anciens si dépassement
   */
  async limitTokensPerUser(
    userId: number,
    maxTokens: number = 5,
  ): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Si plus de maxTokens, supprimer les plus anciens
    if (tokens.length >= maxTokens) {
      const tokensToDelete = tokens.slice(maxTokens - 1);

      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokensToDelete.map((t: { id: number }) => t.id) },
        },
      });

      this.logger.log(
        `${tokensToDelete.length} anciens tokens supprimés pour user ${userId}`,
      );
    }
  }

  /**
   * Obtenir les sessions actives d'un utilisateur
   */
  async getActiveSessions(userId: number) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  /**
   * Obtenir le nombre de sessions actives
   */
  async countActiveSessions(userId: number): Promise<number> {
    return this.prisma.refreshToken.count({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }
}
