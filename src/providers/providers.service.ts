import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PhoneValidationService,
  SmsService,
  JwtTokenService,
} from '../common';
import { ProviderValidatorService } from './shared';
import { RefreshTokenService } from '../auth';
import { RegisterProviderDto, UpdateProviderDto } from './dto';
import * as bcrypt from 'bcrypt';

/**
 * Service Provider - P0.1 Inscription
 * 
 * Principe SOLID appliqué:
 * - SRP: Logique inscription provider uniquement
 * - DIP: Dépend de services abstraits (injection)
 * - Délègue validation téléphone, SMS, JWT aux services partagés
 */
@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,
    // @ts-expect-error - Sera utilisé pour envoi code vérification SMS
    private readonly sms: SmsService,
    private readonly providerValidator: ProviderValidatorService,
    private readonly jwtToken: JwtTokenService,
    private readonly refreshToken: RefreshTokenService,
  ) {}

  /**
   * Inscription provider - VERSION SIMPLIFIÉE
   * 
   * Principe SOLID appliqué:
   * - SRP: Orchestration uniquement, délègue aux méthodes privées
   * - Chaque étape = 1 méthode privée focalisée
   */
  async register(dto: RegisterProviderDto) {
    const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
    
    await this.ensurePhoneIsUnique(normalizedPhone);
    
    const passwordHash = await this.hashPassword(dto.password);
    
    const result = await this.createProviderInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });

    this.logger.log(`Provider créé: ID=${result.providerId}`);

    // Générer JWT tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: result.userId,
      role: 'provider',
      providerId: result.providerId,
    });

    // Stocker refresh token en BD
    await this.storeRefreshToken(result.userId, tokens.refreshToken);

    return this.buildRegistrationResponse(result, dto, tokens);
  }

  /**
   * Récupérer le profil complet du provider
   */
  async getProfile(providerId: number) {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            email: true,
            phoneVerifiedAt: true,
            emailVerifiedAt: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        businessType: {
          select: {
            id: true,
            code: true,
            icon: true,
            translations: {
              where: { locale: 'fr' },
              select: { label: true },
            },
          },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider non trouvé');
    }

    return {
      businessName: provider.businessName,
      businessType: provider.businessType
        ? {
            id: provider.businessType.id,
            code: provider.businessType.code,
            label: provider.businessType.translations[0]?.label || provider.businessType.code,
            icon: provider.businessType.icon,
          }
        : null,
      city: provider.city,
      neighborhood: provider.neighborhood,
      address: provider.address,
      bio: provider.bio,
      yearsExperience: provider.yearsExperience,
      latitude: provider.latitude?.toString(),
      longitude: provider.longitude?.toString(),
      phone: provider.user.phone,
      email: provider.user.email,
      phoneVerifiedAt: provider.user.phoneVerifiedAt,
      emailVerifiedAt: provider.user.emailVerifiedAt,
      isActive: provider.user.isActive,
      lastLoginAt: provider.user.lastLoginAt,
      createdAt: provider.createdAt,
    };
  }

  /**
   * Mettre à jour le profil du provider
   */
  async updateProfile(
    providerId: number,
    userId: number,
    dto: UpdateProviderDto,
  ) {
    // Séparer les champs user et provider
    const { email, ...providerFields } = dto;

    // Transaction pour mettre à jour user et provider
    await this.prisma.$transaction(async (tx) => {
      // Mettre à jour email si fourni
      if (email) {
        await tx.user.update({
          where: { id: userId },
          data: { email },
        });
      }

      // Mettre à jour profil provider si des champs fournis
      if (Object.keys(providerFields).length > 0) {
        await tx.providerProfile.update({
          where: { id: providerId },
          data: providerFields,
        });
      }
    });

    this.logger.log(`Profil provider ${providerId} mis à jour`);

    // Retourner le profil mis à jour
    return this.getProfile(providerId);
  }

  /**
   * Valider et normaliser le téléphone
   * SRP: Délègue au service partagé
   */
  private validateAndNormalizePhone(phone: string): string {
    return this.phoneValidation.validateAndNormalize(phone);
  }

  /**
   * Vérifier unicité du téléphone
   * SRP: Délègue au service partagé
   */
  private async ensurePhoneIsUnique(phone: string): Promise<void> {
    await this.providerValidator.ensurePhoneIsUnique(phone);
  }

  /**
   * Hasher le mot de passe
   * SRP: Fait UNE chose = hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Créer toutes les entités en transaction
   * SRP: Fait UNE chose = création atomique
   */
  private async createProviderInTransaction(data: {
    phone: string;
    passwordHash: string;
    fullName: string;
    city: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await this.createUser(tx, data);
      await this.assignProviderRole(tx, user.id);
      const providerProfile = await this.createProviderProfile(tx, user.id, data);
      await this.createVerificationRecord(tx, providerProfile.id);
      await this.createStatisticsRecord(tx, providerProfile.id);

      return {
        userId: user.id,
        providerId: providerProfile.id,
        phone: user.phone,
      };
    });
  }

  /**
   * Créer l'utilisateur
   * SRP: Création user uniquement
   * 
   * En mode dev (SKIP_PHONE_VERIFICATION=true), le compte est activé directement
   */
  private async createUser(tx: any, data: { phone: string; passwordHash: string }) {
    const skipVerification = process.env.SKIP_PHONE_VERIFICATION === 'true';
    
    return tx.user.create({
      data: {
        phone: data.phone,
        email: null,
        passwordHash: data.passwordHash,
        isActive: skipVerification, // Activé directement en mode dev
        phoneVerifiedAt: skipVerification ? new Date() : null,
      },
    });
  }

  /**
   * Attribuer le rôle provider
   * SRP: Attribution rôle uniquement
   */
  private async assignProviderRole(tx: any, userId: number): Promise<void> {
    const providerRole = await tx.role.findUnique({
      where: { code: 'provider' },
    });

    if (!providerRole) {
      throw new Error('Rôle provider introuvable');
    }

    await tx.userRole.create({
      data: { userId, roleId: providerRole.id },
    });
  }

  /**
   * Créer le profil provider
   * SRP: Création profil uniquement
   */
  private async createProviderProfile(
    tx: any,
    userId: number,
    data: { fullName: string; city: string },
  ) {
    return tx.providerProfile.create({
      data: {
        userId,
        businessName: data.fullName,
        bio: null,
        yearsExperience: 0,
        address: null,
        city: data.city,
        neighborhood: null,
        latitude: null,
        longitude: null,
      },
    });
  }

  /**
   * Créer l'enregistrement de vérification
   * SRP: Création verification uniquement
   */
  private async createVerificationRecord(tx: any, providerId: number): Promise<void> {
    await tx.providerVerification.create({
      data: {
        providerId,
        status: 'pending',
        phoneVerified: false,
        identityVerified: false,
        portfolioVerified: false,
      },
    });
  }

  /**
   * Créer l'enregistrement de statistiques
   * SRP: Création statistics uniquement
   */
  private async createStatisticsRecord(tx: any, providerId: number): Promise<void> {
    await tx.providerStatistics.create({
      data: { providerId },
    });
  }

  /**
   * Stocker refresh token en BD
   * SRP: Délègue au RefreshTokenService
   */
  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

    await this.refreshToken.create({
      token,
      userId,
      expiresAt,
    });

    this.logger.debug(`Refresh token stocké pour user ${userId}`);
  }

  /**
   * Construire la réponse d'inscription
   * SRP: Formatage réponse uniquement
   */
  private buildRegistrationResponse(
    result: { userId: number; providerId: number; phone: string },
    dto: RegisterProviderDto,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ) {
    return {
      user: {
        providerId: result.providerId,
        fullName: dto.fullName,
        phone: result.phone,
        city: dto.city,
        status: 'pending_verification',
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      message:
        'Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS.',
    };
  }
}
