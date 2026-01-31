import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Points de réputation par événement
 */
export const REPUTATION_POINTS = {
  CLIENT: {
    COMPLETED: 10,
    CANCELLED_EARLY: -5,
    CANCELLED_LATE_ACCEPTED: -10,
    CANCELLED_LATE_REJECTED: -15,
    NO_SHOW: -30,
    LATE_15_MIN: -5,
    LATE_30_MIN: -10,
    POSITIVE_REVIEW: 2,
    DISPUTE_WON: 5,
    DISPUTE_LOST: -20,
  },
  PROVIDER: {
    COMPLETED: 10,
    CANCELLED_EARLY: -10,
    CANCELLED_LATE_ACCEPTED: -15,
    CANCELLED_LATE_REJECTED: -25,
    ABSENT: -50,
    LATE_15_MIN: -10,
    LATE_30_MIN: -20,
    POSITIVE_REVIEW: 5,
    REVIEW_RESPONSE: 1,
    DISPUTE_WON: 5,
    DISPUTE_LOST: -30,
  },
};

/**
 * Seuils de réputation
 */
export const REPUTATION_THRESHOLDS = {
  EXCELLENT: 70,
  NORMAL: 50,
  WARNING: 30,
  SUSPENSION: 0,
  MAX_INCIDENTS_BEFORE_BAN: 3,
  SUSPENSION_DAYS: 7,
};

/**
 * Type d'événement de réputation
 */
export type ReputationEvent =
  | 'completed'
  | 'cancelled_early'
  | 'cancelled_late_accepted'
  | 'cancelled_late_rejected'
  | 'no_show'
  | 'absent'
  | 'late_15'
  | 'late_30'
  | 'positive_review'
  | 'review_response'
  | 'dispute_won'
  | 'dispute_lost';

/**
 * Service de gestion de la réputation
 * Gère les scores de fiabilité des clients et providers
 */
@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtenir ou créer la réputation d'un client
   */
  async getOrCreateClientReputation(clientId: number) {
    let reputation = await this.prisma.clientReputation.findUnique({
      where: { clientId },
    });

    if (!reputation) {
      reputation = await this.prisma.clientReputation.create({
        data: { clientId, score: 50 },
      });
      this.logger.log(`Réputation client créée pour userId ${clientId}`);
    }

    return reputation;
  }

  /**
   * Obtenir ou créer la réputation d'un provider
   */
  async getOrCreateProviderReputation(providerId: number) {
    let reputation = await this.prisma.providerReputation.findUnique({
      where: { providerId },
    });

    if (!reputation) {
      reputation = await this.prisma.providerReputation.create({
        data: { providerId, score: 50 },
      });
      this.logger.log(`Réputation provider créée pour providerId ${providerId}`);
    }

    return reputation;
  }

  /**
   * Mettre à jour la réputation d'un client après un événement
   */
  async updateClientReputation(clientId: number, event: ReputationEvent) {
    const reputation = await this.getOrCreateClientReputation(clientId);
    const points = this.getClientPoints(event);

    const updateData: any = {
      score: Math.max(-100, reputation.score + points),
    };

    // Mettre à jour les compteurs selon l'événement
    switch (event) {
      case 'completed':
        updateData.completedCount = reputation.completedCount + 1;
        updateData.totalAppointments = reputation.totalAppointments + 1;
        break;
      case 'no_show':
        updateData.noShowCount = reputation.noShowCount + 1;
        updateData.totalAppointments = reputation.totalAppointments + 1;
        break;
      case 'cancelled_late_accepted':
      case 'cancelled_late_rejected':
        updateData.cancelledLateCount = reputation.cancelledLateCount + 1;
        break;
      case 'late_15':
      case 'late_30':
        updateData.lateCount = reputation.lateCount + 1;
        break;
      case 'dispute_won':
        updateData.disputesWonCount = reputation.disputesWonCount + 1;
        break;
      case 'dispute_lost':
        updateData.disputesLostCount = reputation.disputesLostCount + 1;
        break;
    }

    // Vérifier si suspension nécessaire
    const incidentCount = (updateData.noShowCount ?? reputation.noShowCount) +
      (updateData.disputesLostCount ?? reputation.disputesLostCount);

    if (incidentCount >= REPUTATION_THRESHOLDS.MAX_INCIDENTS_BEFORE_BAN) {
      updateData.isSuspended = true;
      updateData.suspensionReason = 'Trop d\'incidents graves (no-show, litiges perdus)';
      this.logger.warn(`Client ${clientId} banni définitivement`);
    } else if (updateData.score < REPUTATION_THRESHOLDS.SUSPENSION) {
      updateData.isSuspended = true;
      updateData.suspendedUntil = new Date(
        Date.now() + REPUTATION_THRESHOLDS.SUSPENSION_DAYS * 24 * 60 * 60 * 1000,
      );
      updateData.suspensionReason = 'Score de réputation trop bas';
      this.logger.warn(`Client ${clientId} suspendu temporairement`);
    }

    const updated = await this.prisma.clientReputation.update({
      where: { clientId },
      data: updateData,
    });

    this.logger.log(
      `Réputation client ${clientId} mise à jour: ${event} (${points > 0 ? '+' : ''}${points}) → score: ${updated.score}`,
    );

    return updated;
  }

  /**
   * Mettre à jour la réputation d'un provider après un événement
   */
  async updateProviderReputation(providerId: number, event: ReputationEvent) {
    const reputation = await this.getOrCreateProviderReputation(providerId);
    const points = this.getProviderPoints(event);

    const updateData: any = {
      score: Math.max(-100, reputation.score + points),
    };

    // Mettre à jour les compteurs selon l'événement
    switch (event) {
      case 'completed':
        updateData.completedCount = reputation.completedCount + 1;
        updateData.totalAppointments = reputation.totalAppointments + 1;
        break;
      case 'no_show':
        updateData.noShowCount = reputation.noShowCount + 1;
        updateData.totalAppointments = reputation.totalAppointments + 1;
        break;
      case 'absent':
        updateData.absentCount = reputation.absentCount + 1;
        updateData.totalAppointments = reputation.totalAppointments + 1;
        break;
      case 'cancelled_late_accepted':
      case 'cancelled_late_rejected':
        updateData.cancelledLateCount = reputation.cancelledLateCount + 1;
        break;
      case 'late_15':
      case 'late_30':
        updateData.lateCount = reputation.lateCount + 1;
        break;
      case 'dispute_won':
        updateData.disputesWonCount = reputation.disputesWonCount + 1;
        break;
      case 'dispute_lost':
        updateData.disputesLostCount = reputation.disputesLostCount + 1;
        break;
    }

    // Vérifier si suspension nécessaire
    const incidentCount = (updateData.absentCount ?? reputation.absentCount) +
      (updateData.disputesLostCount ?? reputation.disputesLostCount);

    if (incidentCount >= REPUTATION_THRESHOLDS.MAX_INCIDENTS_BEFORE_BAN) {
      updateData.isSuspended = true;
      updateData.suspensionReason = 'Trop d\'incidents graves (absences, litiges perdus)';
      this.logger.warn(`Provider ${providerId} désactivé`);
    } else if (updateData.score < REPUTATION_THRESHOLDS.SUSPENSION) {
      updateData.isSuspended = true;
      updateData.suspendedUntil = new Date(
        Date.now() + REPUTATION_THRESHOLDS.SUSPENSION_DAYS * 24 * 60 * 60 * 1000,
      );
      updateData.suspensionReason = 'Score de réputation trop bas';
      this.logger.warn(`Provider ${providerId} suspendu temporairement`);
    }

    const updated = await this.prisma.providerReputation.update({
      where: { providerId },
      data: updateData,
    });

    this.logger.log(
      `Réputation provider ${providerId} mise à jour: ${event} (${points > 0 ? '+' : ''}${points}) → score: ${updated.score}`,
    );

    return updated;
  }

  /**
   * Vérifier si un client est suspendu
   */
  async isClientSuspended(clientId: number): Promise<boolean> {
    const reputation = await this.prisma.clientReputation.findUnique({
      where: { clientId },
    });

    if (!reputation) return false;

    if (reputation.isSuspended) {
      // Vérifier si la suspension temporaire est expirée
      if (reputation.suspendedUntil && reputation.suspendedUntil < new Date()) {
        await this.prisma.clientReputation.update({
          where: { clientId },
          data: {
            isSuspended: false,
            suspendedUntil: null,
            suspensionReason: null,
          },
        });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Vérifier si un provider est suspendu
   */
  async isProviderSuspended(providerId: number): Promise<boolean> {
    const reputation = await this.prisma.providerReputation.findUnique({
      where: { providerId },
    });

    if (!reputation) return false;

    if (reputation.isSuspended) {
      // Vérifier si la suspension temporaire est expirée
      if (reputation.suspendedUntil && reputation.suspendedUntil < new Date()) {
        await this.prisma.providerReputation.update({
          where: { providerId },
          data: {
            isSuspended: false,
            suspendedUntil: null,
            suspensionReason: null,
          },
        });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Obtenir le badge de réputation d'un client
   */
  getClientBadge(score: number): { badge: string; level: string } {
    if (score >= REPUTATION_THRESHOLDS.EXCELLENT) {
      return { badge: 'Client fiable ✓', level: 'excellent' };
    } else if (score >= REPUTATION_THRESHOLDS.NORMAL) {
      return { badge: '', level: 'normal' };
    } else if (score >= REPUTATION_THRESHOLDS.WARNING) {
      return { badge: '⚠️ Fiabilité faible', level: 'warning' };
    } else {
      return { badge: '🚫 Compte restreint', level: 'restricted' };
    }
  }

  /**
   * Obtenir le badge de réputation d'un provider
   */
  getProviderBadge(score: number): { badge: string; level: string } {
    if (score >= REPUTATION_THRESHOLDS.EXCELLENT) {
      return { badge: 'Pro fiable ✓', level: 'excellent' };
    } else if (score >= REPUTATION_THRESHOLDS.NORMAL) {
      return { badge: '', level: 'normal' };
    } else if (score >= REPUTATION_THRESHOLDS.WARNING) {
      return { badge: '⚠️ Fiabilité à vérifier', level: 'warning' };
    } else {
      return { badge: '🚫 Compte restreint', level: 'restricted' };
    }
  }

  /**
   * Obtenir les points pour un événement client
   */
  private getClientPoints(event: ReputationEvent): number {
    switch (event) {
      case 'completed':
        return REPUTATION_POINTS.CLIENT.COMPLETED;
      case 'cancelled_early':
        return REPUTATION_POINTS.CLIENT.CANCELLED_EARLY;
      case 'cancelled_late_accepted':
        return REPUTATION_POINTS.CLIENT.CANCELLED_LATE_ACCEPTED;
      case 'cancelled_late_rejected':
        return REPUTATION_POINTS.CLIENT.CANCELLED_LATE_REJECTED;
      case 'no_show':
        return REPUTATION_POINTS.CLIENT.NO_SHOW;
      case 'late_15':
        return REPUTATION_POINTS.CLIENT.LATE_15_MIN;
      case 'late_30':
        return REPUTATION_POINTS.CLIENT.LATE_30_MIN;
      case 'positive_review':
        return REPUTATION_POINTS.CLIENT.POSITIVE_REVIEW;
      case 'dispute_won':
        return REPUTATION_POINTS.CLIENT.DISPUTE_WON;
      case 'dispute_lost':
        return REPUTATION_POINTS.CLIENT.DISPUTE_LOST;
      default:
        return 0;
    }
  }

  /**
   * Obtenir les points pour un événement provider
   */
  private getProviderPoints(event: ReputationEvent): number {
    switch (event) {
      case 'completed':
        return REPUTATION_POINTS.PROVIDER.COMPLETED;
      case 'cancelled_early':
        return REPUTATION_POINTS.PROVIDER.CANCELLED_EARLY;
      case 'cancelled_late_accepted':
        return REPUTATION_POINTS.PROVIDER.CANCELLED_LATE_ACCEPTED;
      case 'cancelled_late_rejected':
        return REPUTATION_POINTS.PROVIDER.CANCELLED_LATE_REJECTED;
      case 'absent':
        return REPUTATION_POINTS.PROVIDER.ABSENT;
      case 'late_15':
        return REPUTATION_POINTS.PROVIDER.LATE_15_MIN;
      case 'late_30':
        return REPUTATION_POINTS.PROVIDER.LATE_30_MIN;
      case 'positive_review':
        return REPUTATION_POINTS.PROVIDER.POSITIVE_REVIEW;
      case 'review_response':
        return REPUTATION_POINTS.PROVIDER.REVIEW_RESPONSE;
      case 'dispute_won':
        return REPUTATION_POINTS.PROVIDER.DISPUTE_WON;
      case 'dispute_lost':
        return REPUTATION_POINTS.PROVIDER.DISPUTE_LOST;
      default:
        return 0;
    }
  }
}
