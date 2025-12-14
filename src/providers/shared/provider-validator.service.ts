import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '../../common';

/**
 * Service de validation Provider
 * 
 * Principe SOLID:
 * - SRP: Validations métier provider uniquement
 * - Utilisé par: Tous les services provider
 * - Centralise les vérifications communes
 */
@Injectable()
export class ProviderValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifier qu'un provider existe
   */
  async ensureProviderExists(providerId: number): Promise<void> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider', providerId);
    }
  }

  /**
   * Vérifier que le provider est actif
   */
  async ensureProviderIsActive(providerId: number): Promise<void> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider) {
      throw new NotFoundException('Provider', providerId);
    }

    if (!provider.user.isActive) {
      throw new ConflictException(
        'Provider inactif',
        'PROVIDER_INACTIVE',
        { providerId },
      );
    }
  }

  /**
   * Vérifier que le provider est vérifié
   */
  async ensureProviderIsVerified(providerId: number): Promise<void> {
    const verification = await this.prisma.providerVerification.findUnique({
      where: { providerId },
    });

    if (!verification) {
      throw new NotFoundException('Verification', providerId);
    }

    if (verification.status !== 'approved') {
      throw new ConflictException(
        'Provider non vérifié',
        'PROVIDER_NOT_VERIFIED',
        { providerId, status: verification.status },
      );
    }
  }

  /**
   * Vérifier que le téléphone n'est pas déjà utilisé
   */
  async ensurePhoneIsUnique(phone: string, excludeUserId?: number): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException(
        'Ce numéro de téléphone est déjà utilisé',
        'PHONE_ALREADY_EXISTS',
        { phone },
      );
    }
  }
}
