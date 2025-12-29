import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Critère de complétion du profil
 */
export interface CompletionCriterion {
  key: string;
  label: string;
  description: string;
  weight: number;
  isCompleted: boolean;
  isRequired: boolean;
  category: 'basic' | 'verification' | 'services' | 'visibility';
}

/**
 * Résultat de l'analyse de complétion
 */
export interface ProfileCompletionResult {
  percentage: number;
  status: 'incomplete' | 'basic' | 'good' | 'excellent';
  canReceiveBookings: boolean;
  isVisible: boolean;
  criteria: CompletionCriterion[];
  nextSteps: string[];
  summary: {
    completed: number;
    total: number;
    requiredCompleted: number;
    requiredTotal: number;
  };
}

/**
 * Service de calcul du taux de complétion du profil provider
 * 
 * Catégories:
 * - basic: Infos de base du profil
 * - verification: Vérifications requises
 * - services: Services et disponibilités
 * - visibility: Éléments pour être visible dans les recherches
 */
@Injectable()
export class ProfileCompletionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculer le taux de complétion du profil
   */
  async getProfileCompletion(providerId: number): Promise<ProfileCompletionResult> {
    const provider = await this.fetchProviderData(providerId);

    if (!provider) {
      throw new Error('Provider non trouvé');
    }

    const criteria = this.evaluateCriteria(provider);
    const percentage = this.calculatePercentage(criteria);
    const status = this.determineStatus(percentage);
    const nextSteps = this.getNextSteps(criteria);

    const requiredCriteria = criteria.filter(c => c.isRequired);
    const canReceiveBookings = requiredCriteria.every(c => c.isCompleted);
    const isVisible = this.checkVisibility(provider, criteria);

    return {
      percentage,
      status,
      canReceiveBookings,
      isVisible,
      criteria,
      nextSteps,
      summary: {
        completed: criteria.filter(c => c.isCompleted).length,
        total: criteria.length,
        requiredCompleted: requiredCriteria.filter(c => c.isCompleted).length,
        requiredTotal: requiredCriteria.length,
      },
    };
  }

  /**
   * Récupérer toutes les données du provider
   */
  private async fetchProviderData(providerId: number) {
    return this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            phone: true,
            email: true,
            phoneVerifiedAt: true,
            isActive: true,
          },
        },
        businessType: true,
        verification: true,
        services: {
          where: { isActive: true, deletedAt: null },
        },
        availabilities: {
          where: {
            date: { gte: new Date() },
            isAvailable: true,
          },
        },
        specialties: {
          where: { deletedAt: null },
        },
        registrationDocuments: true,
      },
    });
  }

  /**
   * Évaluer tous les critères de complétion
   */
  private evaluateCriteria(provider: any): CompletionCriterion[] {
    return [
      // === BASIC (Infos de base) ===
      {
        key: 'business_name',
        label: 'Nom du business',
        description: 'Nom de votre salon ou activité',
        weight: 10,
        isCompleted: !!provider.businessName,
        isRequired: true,
        category: 'basic',
      },
      {
        key: 'city',
        label: 'Ville',
        description: 'Ville d\'activité',
        weight: 10,
        isCompleted: !!provider.city,
        isRequired: true,
        category: 'basic',
      },
      {
        key: 'business_type',
        label: 'Type de business',
        description: 'Catégorie de votre activité (salon, freelance...)',
        weight: 5,
        isCompleted: !!provider.businessTypeId,
        isRequired: false,
        category: 'basic',
      },
      {
        key: 'bio',
        label: 'Biographie',
        description: 'Description de votre activité et expertise',
        weight: 5,
        isCompleted: !!provider.bio && provider.bio.length >= 50,
        isRequired: false,
        category: 'basic',
      },
      {
        key: 'neighborhood',
        label: 'Quartier',
        description: 'Quartier précis pour faciliter la localisation',
        weight: 5,
        isCompleted: !!provider.neighborhood,
        isRequired: false,
        category: 'basic',
      },
      {
        key: 'address',
        label: 'Adresse complète',
        description: 'Adresse détaillée de votre lieu de travail',
        weight: 5,
        isCompleted: !!provider.address,
        isRequired: false,
        category: 'basic',
      },
      {
        key: 'geolocation',
        label: 'Géolocalisation',
        description: 'Coordonnées GPS pour la recherche par proximité',
        weight: 5,
        isCompleted: !!provider.latitude && !!provider.longitude,
        isRequired: false,
        category: 'basic',
      },
      {
        key: 'experience',
        label: 'Années d\'expérience',
        description: 'Nombre d\'années d\'expérience dans le métier',
        weight: 3,
        isCompleted: provider.yearsExperience > 0,
        isRequired: false,
        category: 'basic',
      },

      // === VERIFICATION ===
      {
        key: 'phone_verified',
        label: 'Téléphone vérifié',
        description: 'Vérification du numéro de téléphone par SMS',
        weight: 15,
        isCompleted: !!provider.user.phoneVerifiedAt,
        isRequired: true,
        category: 'verification',
      },
      {
        key: 'account_approved',
        label: 'Compte approuvé',
        description: 'Validation de votre compte par notre équipe',
        weight: 15,
        isCompleted: provider.verification?.status === 'approved',
        isRequired: true,
        category: 'verification',
      },
      {
        key: 'identity_document',
        label: 'Pièce d\'identité',
        description: 'Document d\'identité téléchargé (CNI, passeport)',
        weight: 5,
        isCompleted: provider.registrationDocuments?.some((d: any) => d.type === 'identity_card'),
        isRequired: false,
        category: 'verification',
      },

      // === SERVICES ===
      {
        key: 'has_services',
        label: 'Services créés',
        description: 'Au moins un service actif avec prix et durée',
        weight: 15,
        isCompleted: provider.services.length > 0,
        isRequired: true,
        category: 'services',
      },
      {
        key: 'has_availabilities',
        label: 'Disponibilités définies',
        description: 'Créneaux horaires disponibles pour les réservations',
        weight: 10,
        isCompleted: provider.availabilities.length > 0,
        isRequired: true,
        category: 'services',
      },
      {
        key: 'has_specialties',
        label: 'Spécialités renseignées',
        description: 'Vos domaines d\'expertise avec années d\'expérience',
        weight: 5,
        isCompleted: provider.specialties.length > 0,
        isRequired: false,
        category: 'services',
      },

      // === VISIBILITY (bonus) ===
      {
        key: 'email',
        label: 'Email renseigné',
        description: 'Adresse email pour les notifications',
        weight: 2,
        isCompleted: !!provider.user.email,
        isRequired: false,
        category: 'visibility',
      },
      {
        key: 'portfolio',
        label: 'Portfolio',
        description: 'Photos de vos réalisations',
        weight: 5,
        isCompleted: provider.registrationDocuments?.some((d: any) => d.type === 'portfolio'),
        isRequired: false,
        category: 'visibility',
      },
    ];
  }

  /**
   * Calculer le pourcentage de complétion
   */
  private calculatePercentage(criteria: CompletionCriterion[]): number {
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
    const completedWeight = criteria
      .filter(c => c.isCompleted)
      .reduce((sum, c) => sum + c.weight, 0);

    return Math.round((completedWeight / totalWeight) * 100);
  }

  /**
   * Déterminer le statut global
   */
  private determineStatus(percentage: number): 'incomplete' | 'basic' | 'good' | 'excellent' {
    if (percentage < 50) return 'incomplete';
    if (percentage < 70) return 'basic';
    if (percentage < 90) return 'good';
    return 'excellent';
  }

  /**
   * Vérifier si le provider est visible dans les recherches
   */
  private checkVisibility(provider: any, criteria: CompletionCriterion[]): boolean {
    const phoneVerified = criteria.find(c => c.key === 'phone_verified')?.isCompleted;
    const accountApproved = criteria.find(c => c.key === 'account_approved')?.isCompleted;
    
    return !!(
      phoneVerified &&
      accountApproved &&
      provider.user.isActive &&
      !provider.deletedAt
    );
  }

  /**
   * Générer les prochaines étapes recommandées
   */
  private getNextSteps(criteria: CompletionCriterion[]): string[] {
    const steps: string[] = [];
    const incomplete = criteria.filter(c => !c.isCompleted);

    // Priorité aux critères requis
    const requiredIncomplete = incomplete.filter(c => c.isRequired);
    const optionalIncomplete = incomplete.filter(c => !c.isRequired);

    // Ajouter les étapes requises en premier
    for (const criterion of requiredIncomplete) {
      steps.push(this.getStepMessage(criterion));
    }

    // Ajouter jusqu'à 3 étapes optionnelles
    for (const criterion of optionalIncomplete.slice(0, 3)) {
      steps.push(this.getStepMessage(criterion));
    }

    return steps.slice(0, 5); // Max 5 étapes
  }

  /**
   * Générer le message pour une étape
   */
  private getStepMessage(criterion: CompletionCriterion): string {
    const prefix = criterion.isRequired ? '🔴 ' : '🟡 ';
    return `${prefix}${criterion.label}: ${criterion.description}`;
  }
}
