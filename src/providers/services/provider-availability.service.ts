import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from '../dto';
import {
  parseLocalDate,
  isPastDate,
  isToday,
  isPastTimeToday,
  formatDate,
  parseTime,
  formatTime,
  isTimeBefore,
} from '../../common/utils';

/**
 * Service de gestion des disponibilités provider
 * Approche flexible: chaque créneau est lié à une date précise
 */
@Injectable()
export class ProviderAvailabilityService {
  private readonly logger = new Logger(ProviderAvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un créneau de disponibilité pour une date précise
   * Permet plusieurs créneaux par date (sans chevauchement)
   */
  async create(providerId: number, dto: CreateAvailabilityDto) {
    // Parser la date en local (pas UTC)
    const dateObj = parseLocalDate(dto.date);

    // Vérifier que la date est >= aujourd'hui
    if (isPastDate(dateObj)) {
      throw new BadRequestException(
        "La date doit être aujourd'hui ou dans le futur",
      );
    }

    // Si c'est aujourd'hui, vérifier que startTime est dans le futur
    if (isToday(dateObj) && isPastTimeToday(dto.startTime)) {
      throw new BadRequestException(
        "L'heure de début doit être dans le futur pour la date d'aujourd'hui",
      );
    }

    // Parser les heures
    const startTimeObj = parseTime(dto.startTime);
    const endTimeObj = parseTime(dto.endTime);

    // Valider que endTime > startTime
    if (!isTimeBefore(startTimeObj, endTimeObj)) {
      throw new BadRequestException(
        'Heure de fin doit être après heure de début',
      );
    }

    // Vérifier les chevauchements avec les créneaux existants pour cette date
    const existingSlots = await this.prisma.providerAvailability.findMany({
      where: {
        providerId,
        date: dateObj,
      },
    });

    for (const slot of existingSlots) {
      if (this.checkTimeOverlap(startTimeObj, endTimeObj, slot.startTime, slot.endTime)) {
        throw new ConflictException(
          `Ce créneau chevauche un créneau existant (${formatTime(slot.startTime)}-${formatTime(slot.endTime)})`,
        );
      }
    }

    const availability = await this.prisma.providerAvailability.create({
      data: {
        providerId,
        date: dateObj,
        startTime: startTimeObj,
        endTime: endTimeObj,
        isAvailable: dto.isAvailable ?? true,
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Disponibilité créée pour provider ${providerId} le ${dto.date}: ${dto.startTime}-${dto.endTime}`,
    );

    return this.formatAvailability(availability);
  }

  /**
   * Récupérer les disponibilités d'un provider
   * Filtrage optionnel par période
   */
  async findAll(providerId: number, startDate?: string, endDate?: string) {
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

    const availabilities = await this.prisma.providerAvailability.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return availabilities.map((a) => this.formatAvailability(a));
  }

  /**
   * Récupérer une disponibilité par ID
   */
  async findOne(id: number, providerId: number) {
    const availability = await this.prisma.providerAvailability.findFirst({
      where: { id, providerId },
    });

    if (!availability) {
      throw new NotFoundException('Disponibilité non trouvée');
    }

    return this.formatAvailability(availability);
  }

  /**
   * Mettre à jour une disponibilité
   */
  async update(id: number, providerId: number, dto: UpdateAvailabilityDto) {
    const existing = await this.prisma.providerAvailability.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      throw new NotFoundException('Disponibilité non trouvée');
    }

    // Vérifier que la date du créneau n'est pas dans le passé
    if (isPastDate(existing.date)) {
      throw new BadRequestException(
        'Impossible de modifier un créneau dont la date est passée',
      );
    }

    // Valider les horaires si modifiés
    const startTimeObj = dto.startTime ? parseTime(dto.startTime) : existing.startTime;
    const endTimeObj = dto.endTime ? parseTime(dto.endTime) : existing.endTime;

    if (!isTimeBefore(startTimeObj, endTimeObj)) {
      throw new BadRequestException(
        'Heure de fin doit être après heure de début',
      );
    }

    // Si c'est aujourd'hui et qu'on modifie startTime, vérifier que c'est dans le futur
    if (dto.startTime && isToday(existing.date) && isPastTimeToday(dto.startTime)) {
      throw new BadRequestException(
        "L'heure de début doit être dans le futur pour la date d'aujourd'hui",
      );
    }

    // Vérifier les chevauchements si les horaires changent
    if (dto.startTime || dto.endTime) {
      const existingSlots = await this.prisma.providerAvailability.findMany({
        where: {
          providerId,
          date: existing.date,
          id: { not: id },
        },
      });

      for (const slot of existingSlots) {
        if (this.checkTimeOverlap(startTimeObj, endTimeObj, slot.startTime, slot.endTime)) {
          throw new ConflictException(
            `Ce créneau chevauche un créneau existant (${formatTime(slot.startTime)}-${formatTime(slot.endTime)})`,
          );
        }
      }
    }

    const availability = await this.prisma.providerAvailability.update({
      where: { id },
      data: {
        startTime: dto.startTime ? parseTime(dto.startTime) : undefined,
        endTime: dto.endTime ? parseTime(dto.endTime) : undefined,
        isAvailable: dto.isAvailable,
        reason: dto.reason,
      },
    });

    this.logger.log(`Disponibilité ${id} mise à jour`);

    return this.formatAvailability(availability);
  }

  /**
   * Supprimer une disponibilité
   */
  async delete(id: number, providerId: number) {
    const existing = await this.prisma.providerAvailability.findFirst({
      where: { id, providerId },
    });

    if (!existing) {
      throw new NotFoundException('Disponibilité non trouvée');
    }

    await this.prisma.providerAvailability.delete({
      where: { id },
    });

    this.logger.log(`Disponibilité ${id} supprimée`);

    return { message: 'Disponibilité supprimée avec succès' };
  }

  /**
   * Supprimer toutes les disponibilités d'une date
   */
  async deleteByDate(providerId: number, date: string) {
    const dateObj = new Date(date);

    const result = await this.prisma.providerAvailability.deleteMany({
      where: {
        providerId,
        date: dateObj,
      },
    });

    this.logger.log(
      `${result.count} disponibilité(s) supprimée(s) pour provider ${providerId} le ${date}`,
    );

    return {
      message: `${result.count} disponibilité(s) supprimée(s)`,
      count: result.count,
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
    const dateObj = parseLocalDate(formatDate(date));
    const startTimeObj = parseTime(startTime);
    const endTimeObj = parseTime(endTime);

    const slots = await this.prisma.providerAvailability.findMany({
      where: {
        providerId,
        date: dateObj,
        isAvailable: true,
      },
    });

    if (slots.length === 0) {
      return false;
    }

    // Vérifier si le créneau demandé est contenu dans un des créneaux disponibles
    return slots.some(
      (slot) =>
        !isTimeBefore(startTimeObj, slot.startTime) &&
        !isTimeBefore(slot.endTime, endTimeObj),
    );
  }

  /**
   * Vérifier si deux créneaux horaires se chevauchent
   */
  private checkTimeOverlap(
    start1: Date,
    end1: Date,
    start2: Date,
    end2: Date,
  ): boolean {
    return isTimeBefore(start1, end2) && isTimeBefore(start2, end1);
  }

  /**
   * Formater une disponibilité pour la réponse API
   */
  private formatAvailability(availability: any) {
    return {
      id: availability.id,
      date: formatDate(availability.date),
      startTime: formatTime(availability.startTime),
      endTime: formatTime(availability.endTime),
      isAvailable: availability.isAvailable,
      reason: availability.reason,
      createdAt: availability.createdAt,
      updatedAt: availability.updatedAt,
    };
  }
}
