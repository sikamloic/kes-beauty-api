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
import { ThrottlerGuard, Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  JwtAuthGuard,
  AUTH_CONSTANTS,
  AUTH_ERRORS,
  RATE_LIMIT,
  COOKIE_CONFIG,
} from '../common';
import { AuthService, RefreshTokenService, PhoneVerificationService } from './services';
import { LoginDto, SendVerificationCodeDto, VerifyPhoneDto } from './dto';

/**
 * Contrôleur d'authentification
 * 
 * Principe SOLID:
 * - SRP: Gère uniquement le routing HTTP, délègue la logique à AuthService
 * - DIP: Dépend d'abstractions (services injectés)
 * 
 * Rate limiting appliqué sur endpoints sensibles:
 * - login: 5 tentatives/minute
 * - refresh: 20 requêtes/minute
 * - send-verification-code: 3 demandes/minute
 * - verify-phone: 5 tentatives/minute
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly phoneVerification: PhoneVerificationService,
  ) {}

  /**
   * POST /auth/login
   * Connexion avec téléphone/email + mot de passe
   * Rate limit: 5 tentatives par minute (protection brute-force)
   */
  @Post('login')
  @Throttle({ auth: RATE_LIMIT.LOGIN })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    const result = await this.authService.login(dto, request);

    // Stocker refresh token en HttpOnly cookie
    this.setRefreshTokenCookie(response, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * POST /auth/refresh
   * Rafraîchir l'access token
   * Rate limit: 20 requêtes par minute (protection contre abus)
   */
  @Post('refresh')
  @Throttle({ default: RATE_LIMIT.REFRESH })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException(AUTH_ERRORS.REFRESH_TOKEN_MISSING);
    }

    try {
      const result = await this.authService.refresh(refreshToken, request);

      // Mettre à jour cookie avec le nouveau refresh token
      this.setRefreshTokenCookie(response, result.refreshToken);

      return {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    } catch {
      throw new UnauthorizedException(AUTH_ERRORS.REFRESH_TOKEN_INVALID);
    }
  }

  /**
   * POST /auth/logout
   * Déconnexion (révoque refresh token)
   */
  @Post('logout')
  @SkipThrottle()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    await this.authService.logout(refreshToken);

    // Supprimer cookie
    response.clearCookie('refreshToken', {
      path: COOKIE_CONFIG.REFRESH_TOKEN.path,
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
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() request: any) {
    const userId = request.user.userId;

    const count = await this.authService.logoutAll(userId);

    return {
      message: `Déconnecté de ${count} appareil(s)`,
    };
  }

  /**
   * Helper: Configurer le cookie refresh token
   */
  private setRefreshTokenCookie(response: Response, refreshToken: string): void {
    response.cookie('refreshToken', refreshToken, {
      ...COOKIE_CONFIG.REFRESH_TOKEN,
      secure: process.env.NODE_ENV === 'production',
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_MS,
    });
  }

  /**
   * GET /auth/sessions
   * Voir sessions actives
   */
  @Get('sessions')
  @SkipThrottle()
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
   * Rate limit: 3 demandes par minute (protection spam SMS)
   */
  @Post('send-verification-code')
  @Throttle({ otp: RATE_LIMIT.OTP })
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    return this.phoneVerification.sendVerificationCode(dto.phone);
  }

  /**
   * POST /auth/verify-phone
   * Vérifier le code SMS
   * Rate limit: 5 tentatives par minute (protection brute-force OTP)
   */
  @Post('verify-phone')
  @Throttle({ auth: RATE_LIMIT.VERIFY })
  async verifyPhone(@Body() dto: VerifyPhoneDto) {
    return this.phoneVerification.verifyCode(dto.phone, dto.code);
  }
}
