import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth';
import { ProvidersModule } from './providers/providers.module';
import { ClientsModule } from './clients';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true, // Rend ConfigService disponible partout
      load: [configuration], // Charge notre config personnalisée
      envFilePath: '.env', // Fichier .env à la racine
      cache: true, // Cache la config pour performance
      expandVariables: true, // Support variables ${VAR} dans .env
    }),
    // Rate Limiting global
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.ttl', 60) * 1000, // Convertir en ms
            limit: config.get<number>('throttle.limit', 10),
          },
          {
            name: 'auth',
            ttl: 60 * 1000, // 1 minute
            limit: 5, // 5 tentatives par minute pour auth
          },
          {
            name: 'otp',
            ttl: 60 * 1000, // 1 minute
            limit: 3, // 3 demandes OTP par minute
          },
        ],
      }),
    }),
    // Prisma global
    PrismaModule,
    // Common services global (JWT, Phone, SMS, etc.)
    CommonModule,
    // Modules métier
    AuthModule,
    ProvidersModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
