import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, JwtUser } from '../interfaces';

/**
 * JWT Strategy
 * 
 * Principe:
 * - Extrait et valide le JWT depuis le header Authorization
 * - Convertit le payload JWT en objet JwtUser
 * - Utilisé par JwtAuthGuard
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    
    if (!secret) {
      throw new Error('JWT_SECRET non configuré');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Valider le payload JWT
   * Appelé automatiquement après vérification du token
   */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Token invalide');
    }

    return {
      userId: payload.sub,
      role: payload.role,
      roles: payload.roles,
      providerId: payload.providerId,
      clientId: payload.clientId,
    };
  }
}
