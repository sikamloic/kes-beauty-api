import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth';
import { ProvidersModule } from './providers/providers.module';
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
    // Prisma global
    PrismaModule,
    // Common services global (JWT, Phone, SMS, etc.)
    CommonModule,
    // Modules métier
    AuthModule,
    ProvidersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
