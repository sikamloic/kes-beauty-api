import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  FilterAppointmentsDto,
  AppointmentStatus,
} from '../dto';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un rendez-vous (CLIENT)
   */
  async create(clientId: number, dto: CreateAppointmentDto) {
    // 1. Vérifier que le service existe
    const service = await this.prisma.service.findFirst({
      where: {
        id: dto.serviceId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        provider: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service non trouvé ou inactif');
    }

    const scheduledAt = new Date(dto.scheduledAt);

    // 2. Vérifier que la date est dans le futur
    if (scheduledAt <= new Date()) {
      throw new BadRequestException(
        'La date du rendez-vous doit être dans le futur',
      );
    }

    // 3. Vérifier disponibilité du créneau
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        providerId: service.provider.id,
        scheduledAt,
        status: {
          notIn: ['cancelled', 'no_show'],
        },
      },
    });

    if (existingAppointment) {
      throw new ConflictException('Ce créneau est déjà réservé');
    }

    // 4. Créer le rendez-vous
    const appointment = await this.prisma.appointment.create({
      data: {
        clientId,
        providerId: service.provider.id,
        serviceId: service.id,
        scheduledAt,
        durationMinutes: service.duration,
        priceFcfa: Math.round(Number(service.price)),
        status: 'pending',
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
        provider: {
          select: {
            id: true,
            businessName: true,
            city: true,
            neighborhood: true,
          },
        },
      },
    });

    this.logger.log(
      `Rendez-vous créé: ${appointment.id} pour client ${clientId}`,
    );

    return {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      status: appointment.status,
      priceFcfa: appointment.priceFcfa,
      durationMinutes: appointment.durationMinutes,
      service: {
        id: appointment.service.id,
        name: appointment.service.name,
      },
      provider: {
        id: appointment.provider.id,
        businessName: appointment.provider.businessName,
        location: `${appointment.provider.neighborhood || ''}, ${appointment.provider.city}`.trim(),
      },
      createdAt: appointment.createdAt,
    };
  }

  /**
   * Lister les rendez-vous du client
   */
  async findByClient(clientId: number, filters: FilterAppointmentsDto) {
    const { status, startDate, endDate, page = 1, limit = 10 } = filters;

    const where: any = {
      clientId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          provider: {
            select: {
              id: true,
              businessName: true,
              city: true,
              neighborhood: true,
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((apt) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt,
        status: apt.status,
        priceFcfa: apt.priceFcfa,
        durationMinutes: apt.durationMinutes,
        service: apt.service,
        provider: {
          id: apt.provider.id,
          businessName: apt.provider.businessName,
          location: `${apt.provider.neighborhood || ''}, ${apt.provider.city}`.trim(),
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lister les rendez-vous du provider
   */
  async findByProvider(providerId: number, filters: FilterAppointmentsDto) {
    const { status, startDate, endDate, page = 1, limit = 10 } = filters;

    const where: any = {
      providerId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) {
        where.scheduledAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledAt.lte = new Date(endDate);
      }
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          client: {
            select: {
              id: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments.map((apt) => ({
        id: apt.id,
        scheduledAt: apt.scheduledAt,
        status: apt.status,
        priceFcfa: apt.priceFcfa,
        durationMinutes: apt.durationMinutes,
        service: apt.service,
        client: {
          id: apt.client.id,
          phone: apt.client.phone,
          email: apt.client.email,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer un rendez-vous spécifique
   */
  async findOne(appointmentId: number, userId: number, userRole: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: true,
        provider: {
          include: {
            user: {
              select: {
                id: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            phone: true,
            email: true,
          },
        },
        confirmation: true,
        cancellation: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    // Vérifier les permissions
    const isClient = appointment.clientId === userId;
    const isProvider = appointment.provider.userId === userId;

    if (!isClient && !isProvider && userRole !== 'admin') {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    return appointment;
  }

  /**
   * Mettre à jour le statut d'un rendez-vous (PROVIDER)
   */
  async updateStatus(
    appointmentId: number,
    providerId: number,
    userId: number,
    dto: UpdateAppointmentStatusDto,
  ) {
    // Vérifier que le rendez-vous appartient au provider
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        providerId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    // Vérifier les transitions de statut valides
    this.validateStatusTransition(appointment.status, dto.status);

    // Mettre à jour le statut
    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: dto.status },
      });

      // Si confirmation
      if (dto.status === AppointmentStatus.CONFIRMED) {
        await tx.appointmentConfirmation.upsert({
          where: { appointmentId },
          create: {
            appointmentId,
            confirmedByUserId: userId,
            confirmedAt: new Date(),
          },
          update: {
            confirmedByUserId: userId,
            confirmedAt: new Date(),
          },
        });
      }

      // Si annulation
      if (dto.status === AppointmentStatus.CANCELLED) {
        if (!dto.cancellationReason) {
          throw new BadRequestException(
            'La raison d\'annulation est obligatoire',
          );
        }

        await tx.appointmentCancellation.upsert({
          where: { appointmentId },
          create: {
            appointmentId,
            cancelledByUserId: userId,
            cancelledAt: new Date(),
            cancellationReason: dto.cancellationReason,
            cancellationType: 'provider',
          },
          update: {
            cancelledByUserId: userId,
            cancelledAt: new Date(),
            cancellationReason: dto.cancellationReason,
            cancellationType: 'provider',
          },
        });
      }

      return apt;
    });

    this.logger.log(
      `Rendez-vous ${appointmentId} mis à jour: ${dto.status}`,
    );

    return {
      id: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Annuler un rendez-vous (CLIENT)
   */
  async cancelByClient(
    appointmentId: number,
    clientId: number,
    reason: string,
  ) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clientId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    if (appointment.status === 'cancelled') {
      throw new BadRequestException('Rendez-vous déjà annulé');
    }

    if (appointment.status === 'completed') {
      throw new BadRequestException(
        'Impossible d\'annuler un rendez-vous terminé',
      );
    }

    // Vérifier le délai d'annulation (ex: 24h avant)
    const hoursBeforeAppointment =
      (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursBeforeAppointment < 24) {
      throw new BadRequestException(
        'Annulation impossible moins de 24h avant le rendez-vous',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'cancelled' },
      });

      await tx.appointmentCancellation.create({
        data: {
          appointmentId,
          cancelledByUserId: clientId,
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancellationType: 'client',
        },
      });

      return apt;
    });

    this.logger.log(`Rendez-vous ${appointmentId} annulé par client`);

    return {
      id: updated.id,
      status: updated.status,
      message: 'Rendez-vous annulé avec succès',
    };
  }

  /**
   * Valider les transitions de statut
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: AppointmentStatus,
  ): void {
    const validTransitions: Record<string, AppointmentStatus[]> = {
      pending: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
      ],
      confirmed: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      in_progress: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ],
      completed: [],
      cancelled: [],
      no_show: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transition de statut invalide: ${currentStatus} → ${newStatus}`,
      );
    }
  }
}
