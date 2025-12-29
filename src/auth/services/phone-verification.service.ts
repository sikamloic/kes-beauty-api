import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PhoneValidationService } from '../../common';

/**
 * Service de vérification téléphone par SMS
 * 
 * MODE MOCK: Génère des codes fixes pour développement
 * TODO: Intégrer vrai provider SMS (Twilio, Vonage, etc.)
 */
@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);
  
  // Durée de validité du code (5 minutes)
  private readonly CODE_EXPIRY_MINUTES = 5;
  
  // Mode mock pour développement
  private readonly MOCK_MODE = process.env.SMS_MOCK_MODE === 'true';

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,
  ) {}

  /**
   * Envoyer un code de vérification par SMS
   */
  async sendVerificationCode(phone: string): Promise<{ success: boolean; message: string; mockCode?: string }> {
    // Normaliser le téléphone
    const normalizedPhone = this.phoneValidation.validateAndNormalize(phone);

    // Vérifier que l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    // Vérifier si déjà vérifié
    if (user.phoneVerifiedAt) {
      return {
        success: true,
        message: 'Téléphone déjà vérifié',
      };
    }

    // Générer code 6 chiffres
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

    // Stocker le code en BD (table OTP générique)
    await this.prisma.otp.upsert({
      where: {
        identifier_type: {
          identifier: normalizedPhone,
          type: 'phone_verification',
        },
      },
      create: {
        identifier: normalizedPhone,
        type: 'phone_verification',
        code,
        expiresAt,
        attempts: 0,
      },
      update: {
        code,
        expiresAt,
        attempts: 0,
        isUsed: false,
        usedAt: null,
        createdAt: new Date(),
      },
    });

    // MODE MOCK: Retourner le code directement
    if (this.MOCK_MODE) {
      this.logger.warn(`[MOCK MODE] Code SMS pour ${normalizedPhone}: ${code}`);
      return {
        success: true,
        message: 'Code envoyé (mode développement)',
        mockCode: code, // Retourné uniquement en dev
      };
    }

    // TODO: Envoyer SMS réel via provider
    // await this.smsProvider.send(normalizedPhone, `Votre code de vérification: ${code}`);

    this.logger.log(`Code de vérification envoyé à ${normalizedPhone}`);

    return {
      success: true,
      message: 'Code de vérification envoyé par SMS',
    };
  }

  /**
   * Vérifier le code SMS
   */
  async verifyCode(phone: string, code: string): Promise<{ success: boolean; message: string }> {
    // Normaliser le téléphone
    const normalizedPhone = this.phoneValidation.validateAndNormalize(phone);

    // Récupérer le code stocké
    const storedCode = await this.prisma.otp.findUnique({
      where: {
        identifier_type: {
          identifier: normalizedPhone,
          type: 'phone_verification',
        },
      },
    });

    if (!storedCode) {
      throw new BadRequestException('Aucun code de vérification trouvé');
    }

    // Vérifier si déjà utilisé
    if (storedCode.isUsed) {
      throw new BadRequestException('Code déjà utilisé. Demandez un nouveau code.');
    }

    // Vérifier nombre de tentatives (max 3)
    if (storedCode.attempts >= 3) {
      throw new BadRequestException('Trop de tentatives. Demandez un nouveau code.');
    }

    // Vérifier expiration
    if (new Date() > storedCode.expiresAt) {
      throw new BadRequestException('Code expiré. Demandez un nouveau code.');
    }

    // Incrémenter tentatives
    await this.prisma.otp.update({
      where: {
        identifier_type: {
          identifier: normalizedPhone,
          type: 'phone_verification',
        },
      },
      data: { attempts: storedCode.attempts + 1 },
    });

    // Vérifier le code
    if (storedCode.code !== code) {
      const remainingAttempts = 3 - (storedCode.attempts + 1);
      throw new BadRequestException(
        `Code incorrect. ${remainingAttempts} tentative(s) restante(s).`
      );
    }

    // Code valide! Marquer le téléphone comme vérifié ET activer le compte
    await this.prisma.user.update({
      where: { phone: normalizedPhone },
      data: { 
        phoneVerifiedAt: new Date(),
        isActive: true, // Activer le compte après vérification
      },
    });

    // Marquer le code comme utilisé
    await this.prisma.otp.update({
      where: {
        identifier_type: {
          identifier: normalizedPhone,
          type: 'phone_verification',
        },
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    this.logger.log(`Téléphone ${normalizedPhone} vérifié avec succès`);

    return {
      success: true,
      message: 'Téléphone vérifié avec succès',
    };
  }

  /**
   * Générer un code de vérification à 6 chiffres
   * Utilise crypto.randomInt() pour une génération cryptographiquement sécurisée
   */
  private generateVerificationCode(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Nettoyer les codes expirés (à appeler périodiquement)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.prisma.otp.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isUsed: true,
            usedAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Supprimer codes utilisés > 24h
            },
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} codes OTP nettoyés`);
    }

    return result.count;
  }
}
