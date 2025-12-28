import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardPeriod, DashboardFiltersDto } from '../dto';

/**
 * Service Dashboard Provider
 * 
 * Fournit les statistiques et données pour le tableau de bord du provider
 */
@Injectable()
export class ProviderDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupérer le résumé global du dashboard
   */
  async getSummary(providerId: number) {
    const [statistics, todayAppointments, pendingCount] = await Promise.all([
      this.getStatistics(providerId),
      this.getTodayAppointments(providerId),
      this.getPendingAppointmentsCount(providerId),
    ]);

    return {
      statistics,
      today: {
        appointments: todayAppointments,
        count: todayAppointments.length,
      },
      pendingCount,
    };
  }

  /**
   * Récupérer les statistiques globales du provider
   */
  async getStatistics(providerId: number) {
    const stats = await this.prisma.providerStatistics.findUnique({
      where: { providerId },
    });

    if (!stats) {
      return {
        averageRating: '0.00',
        totalReviews: 0,
        totalBookings: 0,
        totalCompleted: 0,
        totalCancelled: 0,
        completionRate: 0,
      };
    }

    const completionRate =
      stats.totalBookings > 0
        ? Math.round((stats.totalCompleted / stats.totalBookings) * 100)
        : 0;

    return {
      averageRating: stats.averageRating.toString(),
      totalReviews: stats.totalReviews,
      totalBookings: stats.totalBookings,
      totalCompleted: stats.totalCompleted,
      totalCancelled: stats.totalCancelled,
      completionRate,
    };
  }

  /**
   * Récupérer les rendez-vous du jour
   */
  async getTodayAppointments(providerId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          in: ['pending', 'confirmed', 'in_progress'],
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    return appointments.map((apt) => ({
      id: apt.id,
      scheduledAt: apt.scheduledAt,
      status: apt.status,
      durationMinutes: apt.durationMinutes,
      priceFcfa: apt.priceFcfa,
      service: apt.service,
      clientPhone: apt.client.phone,
    }));
  }

  /**
   * Récupérer le nombre de RDV en attente
   */
  async getPendingAppointmentsCount(providerId: number): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        providerId,
        status: 'pending',
      },
    });
  }

  /**
   * Récupérer les statistiques de revenus
   */
  async getRevenueStats(providerId: number, filters: DashboardFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        status: 'completed',
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        priceFcfa: true,
        scheduledAt: true,
      },
    });

    const totalRevenue = appointments.reduce((sum, apt) => sum + apt.priceFcfa, 0);
    const averagePerAppointment =
      appointments.length > 0 ? Math.round(totalRevenue / appointments.length) : 0;

    // Grouper par jour pour le graphique
    const revenueByDay = this.groupRevenueByDay(appointments, startDate, endDate);

    return {
      totalRevenue,
      appointmentsCount: appointments.length,
      averagePerAppointment,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
      chart: revenueByDay,
    };
  }

  /**
   * Récupérer les statistiques des rendez-vous par statut
   */
  async getAppointmentStats(providerId: number, filters: DashboardFiltersDto) {
    const { startDate, endDate } = this.getDateRange(filters);

    const appointments = await this.prisma.appointment.groupBy({
      by: ['status'],
      where: {
        providerId,
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        status: true,
      },
    });

    const statusCounts: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    appointments.forEach((apt) => {
      statusCounts[apt.status] = apt._count.status;
    });

    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byStatus: statusCounts,
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * Récupérer les prochains rendez-vous
   */
  async getUpcomingAppointments(providerId: number, limit: number = 5) {
    const now = new Date();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        providerId,
        scheduledAt: {
          gte: now,
        },
        status: {
          in: ['pending', 'confirmed'],
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        client: {
          select: {
            phone: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: limit,
    });

    return appointments.map((apt) => ({
      id: apt.id,
      scheduledAt: apt.scheduledAt,
      status: apt.status,
      durationMinutes: apt.durationMinutes,
      priceFcfa: apt.priceFcfa,
      service: apt.service,
      clientPhone: apt.client.phone,
    }));
  }

  /**
   * Récupérer les services les plus populaires
   */
  async getTopServices(providerId: number, filters: DashboardFiltersDto, limit: number = 5) {
    const { startDate, endDate } = this.getDateRange(filters);

    const services = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        providerId,
        status: {
          in: ['completed', 'confirmed', 'in_progress'],
        },
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        serviceId: true,
      },
      _sum: {
        priceFcfa: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
      take: limit,
    });

    // Récupérer les détails des services
    const serviceIds = services.map((s) => s.serviceId);
    const serviceDetails = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    const serviceMap = new Map(serviceDetails.map((s) => [s.id, s]));

    return services.map((s) => {
      const service = serviceMap.get(s.serviceId);
      return {
        serviceId: s.serviceId,
        name: service?.name || 'Service inconnu',
        price: service?.price?.toString() || '0',
        bookingsCount: s._count.serviceId,
        totalRevenue: s._sum.priceFcfa || 0,
      };
    });
  }

  /**
   * Calculer la plage de dates selon la période
   */
  private getDateRange(filters: DashboardFiltersDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    switch (filters.period) {
      case DashboardPeriod.TODAY:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DashboardPeriod.WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DashboardPeriod.MONTH:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DashboardPeriod.YEAR:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;

      case DashboardPeriod.CUSTOM:
        if (filters.startDate && filters.endDate) {
          startDate = new Date(filters.startDate);
          endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // Fallback to month if custom dates not provided
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
        }
        break;

      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate };
  }

  /**
   * Grouper les revenus par jour pour le graphique
   */
  private groupRevenueByDay(
    appointments: { priceFcfa: number; scheduledAt: Date }[],
    startDate: Date,
    endDate: Date,
  ): { date: string; revenue: number; count: number }[] {
    const revenueMap = new Map<string, { revenue: number; count: number }>();

    // Initialiser tous les jours de la période
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0] as string;
      revenueMap.set(dateKey, { revenue: 0, count: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Remplir avec les données réelles
    appointments.forEach((apt) => {
      const dateKey = apt.scheduledAt.toISOString().split('T')[0] as string;
      const existing = revenueMap.get(dateKey);
      if (existing) {
        existing.revenue += apt.priceFcfa;
        existing.count += 1;
      }
    });

    // Convertir en tableau
    return Array.from(revenueMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      count: data.count,
    }));
  }
}
