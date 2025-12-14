import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SetWeeklyAvailabilityDto,
  CreateAvailabilityExceptionDto,
  UpdateAvailabilityExceptionDto,
} from '../dto';

/**
 * Service de gestion des disponibilités provider
 */
@Injectable()
export class ProviderAvailabilityService {
  private readonly logger = new Logger(ProviderAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Définir les disponibilités hebdomadaires
   * Remplace toutes les disponibilités existantes
   */
  async setWeeklyAvailability(
    providerId: number,
    dto: SetWeeklyAvailabilityDto,
  ) {
    // Valider les horaires
    for (const day of dto.days) {
      for (const slot of day.slots) {
        if (slot.startTime >= slot.endTime) {
          throw new BadRequestException(
            `Heure de fin doit être après heure de début (jour ${day.dayOfWeek})`,
          );
        }
      }
    }

    // Supprimer toutes les disponibilités existantes
    await this.prisma.providerAvailability.deleteMany({
      where: { providerId },
    });

    // Créer les nouvelles disponibilités
    const availabilities = [];
    for (const day of dto.days) {
      for (const slot of day.slots) {
        availabilities.push({
          providerId,
          dayOfWeek: day.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: day.isActive ?? true,
        });
      }
    }

    await this.prisma.providerAvailability.createMany({
      data: availabilities,
    });

    this.logger.log(
      `Disponibilités hebdomadaires définies pour provider ${providerId}`,
    );

    return this.getWeeklyAvailability(providerId);
  }

  /**
   * Récupérer les disponibilités hebdomadaires
   */
  async getWeeklyAvailability(providerId: number) {
    const availabilities = await this.prisma.providerAvailability.findMany({
      where: { providerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    // Grouper par jour
    const grouped = availabilities.reduce(
      (acc: Record<number, any>, avail: any) => {
        if (!acc[avail.dayOfWeek]) {
          acc[avail.dayOfWeek] = {
            dayOfWeek: avail.dayOfWeek,
            isActive: avail.isActive,
            slots: [],
          };
        }
        acc[avail.dayOfWeek].slots.push({
          startTime: avail.startTime,
          endTime: avail.endTime,
        });
        return acc;
      },
      {} as Record<number, any>,
    );

    return {
      days: Object.values(grouped),
    };
  }

  /**
   * Activer/désactiver un jour spécifique
   */
  async toggleDay(providerId: number, dayOfWeek: number, isActive: boolean) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek doit être entre 0 et 6');
    }

    const existing = await this.prisma.providerAvailability.findMany({
      where: {
        providerId,
        dayOfWeek,
      },
    });

    if (existing.length === 0) {
      throw new NotFoundException(
        `Aucune disponibilité trouvée pour le jour ${dayOfWeek}`,
      );
    }

    // Mettre à jour chaque disponibilité individuellement
    // Note: updateMany ne fonctionne pas correctement, on utilise update sur chaque enregistrement
    await Promise.all(
      existing.map((avail) =>
        this.prisma.providerAvailability.update({
          where: { id: avail.id },
          data: { isActive },
        }),
      ),
    );

    this.logger.log(
      `Jour ${dayOfWeek} ${isActive ? 'activé' : 'désactivé'} pour provider ${providerId} (${existing.length} créneaux)`,
    );

    return {
      message: `Jour ${isActive ? 'activé' : 'désactivé'} avec succès`,
      dayOfWeek,
      isActive,
      updatedCount: existing.length,
    };
  }

  /**
   * Créer une exception de disponibilité
   */
  async createException(
    providerId: number,
    dto: CreateAvailabilityExceptionDto,
  ) {
    // Valider les horaires si custom_hours
    if (dto.type === 'custom_hours') {
      if (!dto.startTime || !dto.endTime) {
        throw new BadRequestException(
          'startTime et endTime requis pour type=custom_hours',
        );
      }
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException(
          'Heure de fin doit être après heure de début',
        );
      }
    }

    // Vérifier si exception existe déjà pour cette date
    const existing = await this.prisma.providerAvailabilityException.findUnique(
      {
        where: {
          providerId_date: {
            providerId,
            date: new Date(dto.date),
          },
        },
      },
    );

    if (existing) {
      throw new ConflictException(
        `Une exception existe déjà pour la date ${dto.date}`,
      );
    }

    const exception = await this.prisma.providerAvailabilityException.create({
      data: {
        providerId,
        date: new Date(dto.date),
        type: dto.type,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Exception créée pour provider ${providerId} le ${dto.date}`,
    );

    return {
      id: exception.id,
      date: exception.date.toISOString().split('T')[0],
      type: exception.type,
      startTime: exception.startTime,
      endTime: exception.endTime,
      reason: exception.reason,
      createdAt: exception.createdAt,
    };
  }

  /**
   * Liste des exceptions
   */
  async getExceptions(providerId: number, startDate?: string, endDate?: string) {
    const where: any = { providerId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const exceptions = await this.prisma.providerAvailabilityException.findMany(
      {
        where,
        orderBy: { date: 'asc' },
      },
    );

    return exceptions.map((ex: any) => ({
      id: ex.id,
      date: ex.date.toISOString().split('T')[0],
      type: ex.type,
      startTime: ex.startTime,
      endTime: ex.endTime,
      reason: ex.reason,
      createdAt: ex.createdAt,
    }));
  }

  /**
   * Mettre à jour une exception
   */
  async updateException(
    exceptionId: number,
    providerId: number,
    dto: UpdateAvailabilityExceptionDto,
  ) {
    const existing = await this.prisma.providerAvailabilityException.findFirst({
      where: {
        id: exceptionId,
        providerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Exception non trouvée');
    }

    // Valider les horaires si custom_hours
    const type = dto.type ?? existing.type;
    if (type === 'custom_hours') {
      const startTime = dto.startTime ?? existing.startTime;
      const endTime = dto.endTime ?? existing.endTime;

      if (!startTime || !endTime) {
        throw new BadRequestException(
          'startTime et endTime requis pour type=custom_hours',
        );
      }
      if (startTime >= endTime) {
        throw new BadRequestException(
          'Heure de fin doit être après heure de début',
        );
      }
    }

    const exception = await this.prisma.providerAvailabilityException.update({
      where: { id: exceptionId },
      data: {
        type: dto.type,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reason: dto.reason,
      },
    });

    this.logger.log(`Exception ${exceptionId} mise à jour`);

    return {
      id: exception.id,
      date: exception.date.toISOString().split('T')[0],
      type: exception.type,
      startTime: exception.startTime,
      endTime: exception.endTime,
      reason: exception.reason,
    };
  }

  /**
   * Supprimer une exception
   */
  async deleteException(exceptionId: number, providerId: number) {
    const existing = await this.prisma.providerAvailabilityException.findFirst({
      where: {
        id: exceptionId,
        providerId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Exception non trouvée');
    }

    await this.prisma.providerAvailabilityException.delete({
      where: { id: exceptionId },
    });

    this.logger.log(`Exception ${exceptionId} supprimée`);

    return {
      message: 'Exception supprimée avec succès',
    };
  }

  /**
   * Vérifier si un provider est disponible à une date/heure donnée
   */
  async isAvailable(
    providerId: number,
    date: Date,
    startTime: string,
    endTime: string,
  ): Promise<boolean> {
    // Vérifier les exceptions d'abord
    const dateString = date.toISOString().split('T')[0];
    const dateOnly = new Date(dateString!);
    const exception = await this.prisma.providerAvailabilityException.findUnique(
      {
        where: {
          providerId_date: {
            providerId,
            date: dateOnly,
          },
        },
      },
    );

    if (exception) {
      if (exception.type === 'unavailable') {
        return false;
      }
      // custom_hours
      if (exception.startTime && exception.endTime) {
        return (
          startTime >= exception.startTime && endTime <= exception.endTime
        );
      }
    }

    // Vérifier les horaires réguliers
    const dayOfWeek = date.getDay();
    const availabilities = await this.prisma.providerAvailability.findMany({
      where: {
        providerId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (availabilities.length === 0) {
      return false;
    }

    // Vérifier si le créneau demandé est dans un des créneaux disponibles
    return availabilities.some(
      (avail: any) => startTime >= avail.startTime && endTime <= avail.endTime,
    );
  }
}
