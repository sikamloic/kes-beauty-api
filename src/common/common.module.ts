import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  PhoneValidationService,
  SmsService,
  FileUploadService,
  JwtTokenService,
} from './services';
import { JwtStrategy } from './strategies';

/**
 * Common Module
 * 
 * Principe:
 * - @Global() = Services disponibles partout sans import
 * - Enregistre tous les services communs
 * - Configure JWT avec variables d'environnement
 */
@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN') || '1h',
        },
      }),
    }),
  ],
  providers: [
    // Services communs
    PhoneValidationService,
    SmsService,
    FileUploadService,
    JwtTokenService,
    
    // Strategies
    JwtStrategy,
  ],
  exports: [
    // Exporter pour utilisation dans autres modules
    PhoneValidationService,
    SmsService,
    FileUploadService,
    JwtTokenService,
    JwtModule,
    PassportModule,
  ],
})
export class CommonModule {}
