import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClientProfileDto } from '../dto';
import { NotFoundException } from '../../common';

/**
 * Service de gestion du profil client (SRP)
 * 
 * Responsabilité unique: Gestion du profil client (lecture/mise à jour)
 */
@Injectable()
export class ClientProfileService {
  private readonly logger = new Logger(ClientProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupérer le profil du client connecté
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clientProfile: true,
      },
    });

    if (!user || !user.clientProfile) {
      throw new NotFoundException('Profil client non trouvé');
    }

    return {
      id: user.clientProfile.id,
      phone: user.phone,
      phoneVerified: !!user.phoneVerifiedAt,
      firstName: user.clientProfile.firstName,
      lastName: user.clientProfile.lastName,
      dateOfBirth: user.clientProfile.dateOfBirth,
      preferences: user.clientProfile.preferences,
      createdAt: user.clientProfile.createdAt,
      updatedAt: user.clientProfile.updatedAt,
    };
  }

  /**
   * Mettre à jour le profil du client connecté
   */
  async updateProfile(userId: number, dto: UpdateClientProfileDto) {
    // Vérifier que le profil existe
    const clientProfile = await this.prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      throw new NotFoundException('Profil client non trouvé');
    }

    // Construire les données de mise à jour
    const updateData: any = {};

    if (dto.firstName !== undefined) {
      updateData.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updateData.lastName = dto.lastName;
    }
    if (dto.dateOfBirth !== undefined) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }
    if (dto.preferences !== undefined) {
      updateData.preferences = dto.preferences;
    }

    // Mettre à jour le profil
    const updated = await this.prisma.clientProfile.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            phone: true,
            phoneVerifiedAt: true,
          },
        },
      },
    });

    this.logger.log(`Profil client mis à jour: userId=${userId}`);

    return {
      id: updated.id,
      phone: updated.user.phone,
      phoneVerified: !!updated.user.phoneVerifiedAt,
      firstName: updated.firstName,
      lastName: updated.lastName,
      dateOfBirth: updated.dateOfBirth,
      preferences: updated.preferences,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }
}
