import { Module } from '@nestjs/common';
import { AuthService, RefreshTokenService, PhoneVerificationService } from './services';
import { AuthController } from './auth.controller';

/**
 * Module d'authentification
 * Gère login, refresh tokens et sessions
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenService, PhoneVerificationService],
  exports: [AuthService, RefreshTokenService, PhoneVerificationService],
})
export class AuthModule {}
