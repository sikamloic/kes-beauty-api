import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Service Prisma centralisé
 * Principe SOLID: SRP - Responsabilité unique = gestion connexion BD
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prisma: PrismaClient;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // Parse DATABASE_URL (format: mysql://user:password@host:port/database)
    const url = new URL(databaseUrl);
    
    // Créer adapter MariaDB (compatible MySQL) - Requis par Prisma 7
    const adapter = new PrismaMariaDb({
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
      connectionLimit: 10,
    });

    // Initialisation PrismaClient avec adapter
    this.prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });

    this.logger.log('PrismaService initialized with MariaDB adapter');
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('Database disconnected');
  }

  // Expose PrismaClient methods
  get user() {
    return this.prisma.user;
  }

  get role() {
    return this.prisma.role;
  }

  get userRole() {
    return this.prisma.userRole;
  }

  get clientProfile() {
    return this.prisma.clientProfile;
  }

  get providerProfile() {
    return this.prisma.providerProfile;
  }

  get providerRegistrationDocument() {
    return this.prisma.providerRegistrationDocument;
  }

  get providerServiceSettings() {
    return this.prisma.providerServiceSettings;
  }

  get providerVerification() {
    return this.prisma.providerVerification;
  }

  get providerStatistics() {
    return this.prisma.providerStatistics;
  }

  get refreshToken() {
    return this.prisma.refreshToken;
  }

  get otp() {
    return this.prisma.otp;
  }

  get serviceCategory() {
    return this.prisma.serviceCategory;
  }

  get service() {
    return this.prisma.service;
  }

  get providerSpecialty() {
    return this.prisma.providerSpecialty;
  }

  get providerAvailability() {
    return this.prisma.providerAvailability;
  }

  get providerAvailabilityException() {
    return this.prisma.providerAvailabilityException;
  }

  get businessType() {
    return this.prisma.businessType;
  }

  // Expose utility methods
  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  get $connect() {
    return this.prisma.$connect.bind(this.prisma);
  }

  get $disconnect() {
    return this.prisma.$disconnect.bind(this.prisma);
  }

  get $queryRaw() {
    return this.prisma.$queryRaw.bind(this.prisma);
  }

  get $executeRaw() {
    return this.prisma.$executeRaw.bind(this.prisma);
  }

  get $queryRawUnsafe() {
    return this.prisma.$queryRawUnsafe.bind(this.prisma);
  }

  get $executeRawUnsafe() {
    return this.prisma.$executeRawUnsafe.bind(this.prisma);
  }
}
