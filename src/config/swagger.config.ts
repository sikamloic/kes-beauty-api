import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configuration Swagger centralisée
 * Principe SOLID: SRP - Responsabilité unique = configuration documentation API
 */
export class SwaggerConfig {
  /**
   * Configure et initialise Swagger pour l'application
   */
  static setup(app: INestApplication, config: SwaggerSetupOptions): void {
    const documentConfig = new DocumentBuilder()
      .setTitle(config.title)
      .setDescription(config.description)
      .setVersion(config.version)
      .addServer(config.serverUrl, config.serverDescription)
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Endpoints authentification')
      .addTag('Providers', 'Endpoints prestataires')
      .addTag('Clients', 'Endpoints clients')
      .addTag('Services', 'Endpoints services')
      .addTag('Appointments', 'Endpoints réservations')
      .addTag('Payments', 'Endpoints paiements')
      .addTag('Reviews', 'Endpoints avis')
      .build();

    const document = SwaggerModule.createDocument(app, documentConfig, {
      operationIdFactory: (_controllerKey: string, methodKey: string) =>
        methodKey,
    });

    SwaggerModule.setup(config.path, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'none',
        filter: true,
        tryItOutEnabled: true,
      },
      customSiteTitle: config.title,
      customfavIcon: '/favicon.ico',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { margin: 20px 0; }
      `,
    });
  }
}

/**
 * Options de configuration Swagger
 */
export interface SwaggerSetupOptions {
  title: string;
  description: string;
  version: string;
  path: string;
  serverUrl: string;
  serverDescription: string;
}

/**
 * Configuration par défaut pour l'environnement
 */
export const getSwaggerConfig = (env: string): SwaggerSetupOptions => {
  const baseConfig = {
    title: 'Beauty Platform API',
    description: `
      API REST pour la plateforme de réservation de services beauté au Cameroun.
      
      ## Fonctionnalités
      - 🔐 Authentification JWT
      - 👤 Gestion prestataires & clients
      - 📅 Système de réservation
      - 💳 Paiements mobile (Orange Money, MTN Money)
      - ⭐ Système d'avis
      
      ## Environnement
      **${env.toUpperCase()}**
    `,
    version: '1.0.0',
    path: 'api/docs',
  };

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        serverUrl: 'https://api.beautyplatform.cm',
        serverDescription: 'Production server',
      };

    case 'staging':
      return {
        ...baseConfig,
        serverUrl: 'https://staging-api.beautyplatform.cm',
        serverDescription: 'Staging server',
      };

    default: // development
      return {
        ...baseConfig,
        serverUrl: 'http://localhost:4000',
        serverDescription: 'Development server',
      };
  }
};
