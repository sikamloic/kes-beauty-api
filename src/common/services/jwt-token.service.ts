import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, JwtTokenPair, UserRole } from '../interfaces';

/**
 * Service JWT Token
 * 
 * Principe SOLID:
 * - SRP: Génération et validation JWT uniquement
 * - Utilisé par: Tous les modules (providers, clients, auth)
 * - Structure JWT unifiée pour tous les rôles
 */
@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Générer access token
   */
  generateAccessToken(payload: {
    userId: number;
    role: UserRole;
    providerId?: number;
    clientId?: number;
    roles?: UserRole[];
  }): string {
    const jwtPayload: Partial<JwtPayload> = {
      sub: payload.userId,
      role: payload.role,
    };

    // Ajouter providerId si provider
    if (payload.providerId) {
      jwtPayload.providerId = payload.providerId;
    }

    // Ajouter clientId si client
    if (payload.clientId) {
      jwtPayload.clientId = payload.clientId;
    }

    // Ajouter roles si multi-rôles
    if (payload.roles && payload.roles.length > 1) {
      jwtPayload.roles = payload.roles;
    }

    return this.jwtService.sign(jwtPayload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '1h',
    });
  }

  /**
   * Générer refresh token
   */
  generateRefreshToken(userId: number): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      },
    );
  }

  /**
   * Générer paire de tokens (access + refresh)
   */
  generateTokenPair(payload: {
    userId: number;
    role: UserRole;
    providerId?: number;
    clientId?: number;
    roles?: UserRole[];
  }): JwtTokenPair {
    const expiresIn = this.parseExpiresIn(
      this.config.get('JWT_EXPIRES_IN') || '1h',
    );

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload.userId),
      expiresIn,
    };
  }

  /**
   * Vérifier et décoder access token
   */
  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_SECRET'),
    });
  }

  /**
   * Vérifier et décoder refresh token
   */
  verifyRefreshToken(token: string): { sub: number } {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
    });
  }

  /**
   * Décoder token sans vérification (pour debug)
   */
  decodeToken(token: string): JwtPayload | null {
    return this.jwtService.decode(token) as JwtPayload;
  }

  /**
   * Convertir durée string en secondes
   * Exemples: '1h' → 3600, '7d' → 604800, '30m' → 1800
   */
  private parseExpiresIn(duration: string | undefined): number {
    if (!duration) {
      return 3600; // Default 1h
    }

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match || !match[1] || !match[2]) {
      return 3600; // Default 1h
    }

    const value = parseInt(match[1], 10);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (multipliers[unit] ?? 3600);
  }
}
