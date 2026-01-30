import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JwtTokenService,
  PhoneValidationService,
  AUTH_CONSTANTS,
  AUTH_ERRORS,
} from '../../common';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from '../dto';
import * as bcrypt from 'bcrypt';

/**
 * Interface pour le résultat du login
 */
interface LoginResult {
  user: {
    phone: string;
    role: string;
    providerId?: number;
    clientId?: number;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Interface pour le résultat du refresh
 */
interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Service d'authentification
 * 
 * Principe SOLID:
 * - SRP: Logique d'authentification uniquement
 * - DIP: Dépend d'abstractions (services injectés)
 * - Sépare la logique métier du contrôleur
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtToken: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly phoneValidation: PhoneValidationService,
  ) {}

  /**
   * Authentifier un utilisateur
   * 
   * @param dto - Credentials (login + password)
   * @param request - Request pour extraire device info
   * @returns LoginResult avec tokens
   */
  async login(dto: LoginDto, request: Request): Promise<LoginResult> {
    const { login, password } = dto;

    // Normaliser le login
    const { normalizedLogin, isEmail } = this.normalizeLogin(login);

    // Récupérer l'utilisateur
    const user = await this.findUserByLogin(normalizedLogin, isEmail);

    // Vérifier les credentials (protection timing attack)
    // Cette méthode lance une exception si invalide, donc user est garanti non-null après
    const validatedUser = await this.verifyCredentials(user, password);

    // Vérifier que le compte est actif
    this.ensureUserIsActive(validatedUser);

    // Déterminer le rôle
    const role = this.determineRole(validatedUser);

    // Générer les tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: validatedUser.id,
      role: role as 'provider' | 'client' | 'admin',
      providerId: validatedUser.providerProfile?.id,
      clientId: validatedUser.clientProfile?.id,
    });

    // Créer la session
    await this.createSession(validatedUser.id, tokens.refreshToken, request);

    // Mettre à jour lastLoginAt
    await this.updateLastLogin(validatedUser.id);

    this.logger.log(`User ${validatedUser.id} logged in successfully`);

    return {
      user: {
        phone: validatedUser.phone,
        role,
        providerId: validatedUser.providerProfile?.id,
        clientId: validatedUser.clientProfile?.id,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Rafraîchir les tokens
   * 
   * @param refreshToken - Token de rafraîchissement actuel
   * @param request - Request pour extraire device info
   * @returns RefreshResult avec nouveaux tokens
   */
  async refresh(refreshToken: string, request: Request): Promise<RefreshResult> {
    // Vérifier la signature JWT
    const payload = this.jwtToken.verifyRefreshToken(refreshToken);

    // Vérifier si le token existe en BD et est valide
    const isValid = await this.refreshTokenService.verify(refreshToken);
    if (!isValid) {
      throw new UnauthorizedException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }

    // Récupérer l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        providerProfile: true,
        clientProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException(AUTH_ERRORS.USER_INVALID);
    }

    // Déterminer le rôle
    const role = this.determineRole(user);

    // Générer nouveaux tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: user.id,
      role: role as 'provider' | 'client' | 'admin',
      providerId: user.providerProfile?.id,
      clientId: user.clientProfile?.id,
    });

    // ROTATION: Révoquer l'ancien token et créer le nouveau
    await this.refreshTokenService.revoke(refreshToken);
    await this.createSession(user.id, tokens.refreshToken, request);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Déconnecter un utilisateur (révoquer le refresh token)
   */
  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }
  }

  /**
   * Déconnecter de tous les appareils
   */
  async logoutAll(userId: number): Promise<number> {
    return this.refreshTokenService.revokeAllForUser(userId);
  }

  /**
   * Normaliser le login (email ou téléphone)
   */
  private normalizeLogin(login: string): { normalizedLogin: string; isEmail: boolean } {
    const isEmail = login.includes('@');

    try {
      const normalizedLogin = isEmail
        ? login
        : this.phoneValidation.validateAndNormalize(login);

      return { normalizedLogin, isEmail };
    } catch {
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }
  }

  /**
   * Rechercher un utilisateur par login
   */
  private async findUserByLogin(normalizedLogin: string, isEmail: boolean) {
    return this.prisma.user.findUnique({
      where: isEmail ? { email: normalizedLogin } : { phone: normalizedLogin },
      include: {
        providerProfile: true,
        clientProfile: true,
      },
    });
  }

  /**
   * Vérifier les credentials avec protection timing attack
   * Retourne l'utilisateur validé (non-null garanti)
   */
  private async verifyCredentials<T extends { passwordHash: string }>(
    user: T | null,
    password: string,
  ): Promise<T> {
    // Protection timing attack: toujours exécuter bcrypt.compare
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.passwordHash || AUTH_CONSTANTS.DUMMY_HASH,
    );

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    return user;
  }

  /**
   * Vérifier que l'utilisateur est actif
   */
  private ensureUserIsActive(user: { isActive: boolean }): void {
    if (!user.isActive) {
      throw new UnauthorizedException(AUTH_ERRORS.ACCOUNT_DISABLED);
    }
  }

  /**
   * Déterminer le rôle de l'utilisateur
   */
  private determineRole(user: {
    providerProfile?: { id: number } | null;
    clientProfile?: { id: number } | null;
  }): string {
    if (user.providerProfile) return 'provider';
    if (user.clientProfile) return 'client';
    return 'admin';
  }

  /**
   * Créer une session (stocker refresh token)
   */
  private async createSession(
    userId: number,
    refreshToken: string,
    request: Request,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AUTH_CONSTANTS.REFRESH_TOKEN_DAYS);

    await this.refreshTokenService.create({
      token: refreshToken,
      userId,
      expiresAt,
      deviceInfo: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    // Limiter le nombre de sessions
    await this.refreshTokenService.limitTokensPerUser(
      userId,
      AUTH_CONSTANTS.MAX_SESSIONS_PER_USER,
    );
  }

  /**
   * Mettre à jour la date de dernière connexion
   */
  private async updateLastLogin(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}
