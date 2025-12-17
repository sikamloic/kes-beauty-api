import 'dotenv/config';

// Définir le timezone avant tout (doit être fait avant les imports qui utilisent Date)
process.env.TZ = process.env.TZ || 'Africa/Douala';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  GlobalExceptionFilter,
  LoggingInterceptor,
  ResponseTransformInterceptor,
} from './common';
import { SwaggerConfig, getSwaggerConfig } from './config/swagger.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Création de l'application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configuration service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 4000);
  const env = configService.get<string>('app.env', 'development');

  // ========================================
  // SÉCURITÉ
  // ========================================

  // Headers de sécurité (helmet)
  app.use(helmet());

  // Cookie parser - Parse les cookies des requêtes
  app.use(cookieParser());

  // CORS - Configuration stricte en prod, permissive en dev
  const allowedOrigins = configService.get<string[]>('cors.allowedOrigins', [
    'http://localhost:4000',
  ]);
  
  app.enableCors({
    origin: env === 'development' 
      ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // En dev: autoriser localhost + réseau local
          if (!origin) {
            callback(null, true);
            return;
          }
          
          // Patterns autorisés en dev
          const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,           // localhost
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,        // 127.0.0.1
            /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,  // 192.168.x.x
            /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/, // 10.x.x.x
            /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/, // 172.16-31.x.x
          ];
          
          const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
          callback(null, isAllowed);
        }
      : allowedOrigins, // En prod: liste stricte
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'X-Requested-With',
      'x-platform',
      'x-request-id',
      'x-client-version',
      'x-device-id',
      'Accept',
      'Accept-Language',
    ],
    exposedHeaders: ['x-request-id', 'x-response-time'],
  });

  // ========================================
  // GESTION DES ERREURS (SOLID)
  // ========================================

  // Filter global pour capturer toutes les exceptions
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Intercepteurs globaux (ordre important)
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // 1. Log requêtes/réponses
    new ResponseTransformInterceptor(), // 2. Transforme réponses en format standard
  );

  // ========================================
  // VALIDATION GLOBALE
  // ========================================

  app.useGlobalPipes(
    new ValidationPipe({
      // Sécurité: retire les propriétés non définies dans les DTOs
      whitelist: true,
      // Sécurité: rejette les requêtes avec propriétés inconnues
      forbidNonWhitelisted: true,
      // Transformation automatique des types (string -> number, etc.)
      transform: true,
      // Transformation des paramètres de route et query
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Messages d'erreur détaillés en dev, génériques en prod
      disableErrorMessages: env === 'production',
    }),
  );

  // ========================================
  // PERFORMANCE
  // ========================================

  // Compression des réponses
  app.use(compression());

  // Préfixe global pour toutes les routes
  app.setGlobalPrefix('api/v1');

  // ========================================
  // DOCUMENTATION API (SWAGGER)
  // ========================================

  // Swagger activé en dev et staging uniquement
  if (env !== 'production') {
    const swaggerConfig = getSwaggerConfig(env);
    SwaggerConfig.setup(app, swaggerConfig);
    logger.log(`📚 Swagger disponible sur: http://localhost:${port}/${swaggerConfig.path}`);
  }

  // ========================================
  // DÉMARRAGE
  // ========================================

  // Écouter sur toutes les interfaces réseau (0.0.0.0)
  // Permet l'accès depuis le réseau local (ex: 192.168.x.x)
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application démarrée sur:`);
  logger.log(`   - Local:   http://localhost:${port}/api/v1`);
  logger.log(`   - Réseau:  http://192.168.x.x:${port}/api/v1`);
  logger.log(`📝 Environnement: ${env}`);
  logger.log(`🔒 CORS activé pour: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
  console.error('❌ Erreur au démarrage de l\'application:', error);
  process.exit(1);
});
