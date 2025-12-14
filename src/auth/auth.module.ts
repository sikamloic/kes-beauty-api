import { Module } from '@nestjs/common';
import { RefreshTokenService, PhoneVerificationService } from './services';
import { AuthController } from './auth.controller';

/**
 * Module d'authentification
 * Gère login, refresh tokens et sessions
 */
@Module({
  controllers: [AuthController],
  providers: [RefreshTokenService, PhoneVerificationService],
  exports: [RefreshTokenService, PhoneVerificationService],
})
export class AuthModule {}
