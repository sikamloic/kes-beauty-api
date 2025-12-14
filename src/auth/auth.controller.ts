import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtTokenService, JwtAuthGuard, PhoneValidationService } from '../common';
import { RefreshTokenService, PhoneVerificationService } from './services';
import { LoginDto, SendVerificationCodeDto, VerifyPhoneDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

/**
 * Contrôleur d'authentification
 * Gère login, refresh, logout
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtToken: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly phoneValidation: PhoneValidationService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  /**
   * POST /auth/login
   * Connexion avec téléphone/email + mot de passe
   */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const { login, password } = dto;

    // Déterminer si c'est un email ou téléphone
    const isEmail = login.includes('@');

    // Normaliser le téléphone si ce n'est pas un email
    let normalizedLogin: string;
    try {
      normalizedLogin = isEmail 
        ? login 
        : this.phoneValidation.validateAndNormalize(login);
      
      console.log('🔍 Login attempt:', {
        original: login,
        normalized: normalizedLogin,
        isEmail,
      });
    } catch (error) {
      console.log('❌ Normalisation échouée:', login, error);
      throw new UnauthorizedException('Identifiants invalides');
    }

    // Récupérer utilisateur
    const user = await this.prisma.user.findUnique({
      where: isEmail ? { email: normalizedLogin } : { phone: normalizedLogin },
      include: {
        providerProfile: true,
        clientProfile: true,
      },
    });

    if (!user) {
      console.log('❌ User null');
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    if (!user.isActive) {
      console.log('❌ User inactif');
      throw new UnauthorizedException(
        'Votre compte a été désactivé. Contactez le support pour plus d\'informations.'
      );
    }

    // Vérifier mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('🔐 Password check:', {
      provided: password.substring(0, 3) + '***',
      valid: isPasswordValid,
    });
    
    if (!isPasswordValid) {
      console.log('❌ Mot de passe invalide');
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect');
    }

    // Déterminer le rôle
    const role = user.providerProfile
      ? 'provider'
      : user.clientProfile
        ? 'client'
        : 'admin';

    // Générer tokens
    const tokens = this.jwtToken.generateTokenPair({
      userId: user.id,
      role: role as 'provider' | 'client' | 'admin',
      providerId: user.providerProfile?.id,
      clientId: user.clientProfile?.id,
    });

    // Stocker refresh token en BD
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenService.create({
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt,
      deviceInfo: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    // Limiter à 5 appareils
    await this.refreshTokenService.limitTokensPerUser(user.id, 5);

    // Stocker refresh token en HttpOnly cookie
    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/v1/auth',
    });

    // Mettre à jour lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        phone: user.phone,
        role,
        providerId: user.providerProfile?.id,
        clientId: user.clientProfile?.id,
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * POST /auth/refresh
   * Rafraîchir l'access token
   */
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      // Vérifier signature JWT
      const payload = this.jwtToken.verifyRefreshToken(refreshToken);

      // Vérifier si token existe en BD et est valide
      const isValid = await this.refreshTokenService.verify(refreshToken);

      if (!isValid) {
        throw new UnauthorizedException('Refresh token invalide ou révoqué');
      }

      // Récupérer utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          providerProfile: true,
          clientProfile: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Utilisateur invalide');
      }

      // Déterminer le rôle
      const role = user.providerProfile
        ? 'provider'
        : user.clientProfile
          ? 'client'
          : 'admin';

      // Générer nouveaux tokens
      const tokens = this.jwtToken.generateTokenPair({
        userId: user.id,
        role: role as 'provider' | 'client' | 'admin',
        providerId: user.providerProfile?.id,
        clientId: user.clientProfile?.id,
      });

      // ROTATION: Révoquer l'ancien refresh token
      await this.refreshTokenService.revoke(refreshToken);

      // Stocker nouveau refresh token en BD
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.refreshTokenService.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo: request.headers['user-agent'],
        ipAddress: request.ip,
      });

      // Révoquer ancien refresh token
      await this.refreshTokenService.revoke(refreshToken);

      // Limiter nombre de tokens
      await this.refreshTokenService.limitTokensPerUser(user.id, 5);

      // Mettre à jour cookie
      response.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  /**
   * POST /auth/logout
   * Déconnexion (révoque refresh token)
   */
  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }

    // Supprimer cookie
    response.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });

    return {
      message: 'Déconnexion réussie',
    };
  }

  /**
   * POST /auth/logout-all
   * Déconnexion de tous les appareils
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() request: any) {
    const userId = request.user.userId;

    const count = await this.refreshTokenService.revokeAllForUser(userId);

    return {
      message: `Déconnecté de ${count} appareil(s)`,
    };
  }

  /**
   * GET /auth/sessions
   * Voir sessions actives
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Req() request: any) {
    const userId = request.user.userId;

    const sessions = await this.refreshTokenService.getActiveSessions(userId);

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        device: s.deviceInfo,
        ip: s.ipAddress,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
      })),
    };
  }

  /**
   * POST /auth/send-verification-code
   * Envoyer code de vérification SMS
   */
  @Post('send-verification-code')
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    return this.phoneVerification.sendVerificationCode(dto.phone);
  }

  /**
   * POST /auth/verify-phone
   * Vérifier le code SMS
   */
  @Post('verify-phone')
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.phoneVerification.verifyCode(dto.phone, dto.code);
  }
}
