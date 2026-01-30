import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterClientDto } from '../dto';
import { PhoneValidationService, JwtTokenService } from '../../common';
import { RefreshTokenService } from '../../auth';
import * as bcrypt from 'bcrypt';

/**
 * Service d'inscription client (SRP)
 * 
 * Responsabilité unique: Gestion de l'inscription des clients
 */
@Injectable()
export class ClientRegistrationService {
  private readonly logger = new Logger(ClientRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,
    private readonly jwtToken: JwtTokenService,
    private readonly refreshToken: RefreshTokenService,
  ) {}

  /**
   * Inscription client
   * 
   * Crée un compte client avec:
   * - User (téléphone, mot de passe)
   * - ClientProfile (nom)
   * - Attribution du rôle 'client'
   */
  async register(dto: RegisterClientDto) {
    const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
    
    await this.ensurePhoneIsUnique(normalizedPhone);
    
    const passwordHash = await this.hashPassword(dto.password);
    
    const result = await this.createClientInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });

    this.logger.log(`Client créé: ID=${result.clientId}`);

    // Générer JWT tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: result.userId,
      role: 'client',
      clientId: result.clientId,
    });

    // Stocker refresh token en BD
    await this.storeRefreshToken(result.userId, tokens.refreshToken);

    return this.buildRegistrationResponse(result, tokens);
  }

  /**
   * Valider et normaliser le téléphone
   */
  private validateAndNormalizePhone(phone: string): string {
    return this.phoneValidation.validateAndNormalize(phone);
  }

  /**
   * Vérifier unicité du téléphone
   */
  private async ensurePhoneIsUnique(phone: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
    }
  }

  /**
   * Hasher le mot de passe
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Créer le client en transaction
   */
  private async createClientInTransaction(data: {
    phone: string;
    passwordHash: string;
    firstName: string;
    lastName?: string;
    email?: string;
  }) {
    const skipVerification = process.env.SKIP_PHONE_VERIFICATION === 'true';
    
    return this.prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          phone: data.phone,
          email: data.email || null,
          passwordHash: data.passwordHash,
          isActive: skipVerification,
          phoneVerifiedAt: skipVerification ? new Date() : null,
        },
      });

      // Attribuer le rôle client
      const clientRole = await tx.role.findUnique({
        where: { code: 'client' },
      });

      if (!clientRole) {
        throw new Error('Rôle client introuvable');
      }

      await tx.userRole.create({
        data: { userId: user.id, roleId: clientRole.id },
      });

      // Créer le profil client
      const clientProfile = await tx.clientProfile.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName || null,
        },
      });

      return {
        userId: user.id,
        clientId: clientProfile.id,
        phone: user.phone,
        firstName: data.firstName,
        lastName: data.lastName,
      };
    });
  }

  /**
   * Stocker refresh token en BD
   */
  private async storeRefreshToken(
    userId: number,
    token: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshToken.create({
      token,
      userId,
      expiresAt,
    });
  }

  /**
   * Construire la réponse d'inscription
   */
  private buildRegistrationResponse(
    result: { userId: number; clientId: number; phone: string; firstName: string; lastName?: string },
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ) {
    return {
      user: {
        clientId: result.clientId,
        firstName: result.firstName,
        lastName: result.lastName || null,
        phone: result.phone,
        status: 'pending_verification',
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      message:
        'Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS.',
    };
  }
}
