import { Controller, Get, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ApiOkResponse, ApiResponseHelper } from './common';

@ApiTags('Health')
@Controller('health')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check simple' })
  @ApiOkResponse('API opérationnelle')
  getHello(@Req() request: Request) {
    return ApiResponseHelper.success(
      { status: 'ok', service: 'Beauty Platform API' },
      this.appService.getHello(),
      {
        path: request.path,
        method: request.method,
      },
    );
  }

  @Get('config')
  @ApiOperation({ summary: 'Configuration de l\'application' })
  @ApiOkResponse('Configuration récupérée')
  getConfig(@Req() request: Request) {
    const config = {
      app: {
        name: this.configService.get<string>('app.name'),
        env: this.configService.get<string>('app.env'),
        port: this.configService.get<number>('app.port'),
      },
      database: {
        configured: !!this.configService.get<string>('DATABASE_URL'),
      },
    };

    return ApiResponseHelper.success(config, 'Configuration récupérée', {
      path: request.path,
      method: request.method,
    });
  }

  @Get('db')
  @ApiOperation({
    summary: 'Test connexion base de données',
    description: 'Vérifie que la connexion à MySQL est opérationnelle',
  })
  @ApiOkResponse('Base de données connectée', undefined, {
    status: 'healthy',
    database: 'connected',
    latency: 5,
  })
  async checkDatabase(@Req() request: Request) {
    const startTime = Date.now();

    try {
      // Test connexion avec une requête simple
      await this.prisma.$queryRaw`SELECT 1 as result`;

      const latency = Date.now() - startTime;

      return ApiResponseHelper.success(
        {
          status: 'healthy',
          database: 'connected',
          latency: `${latency}ms`,
        },
        'Base de données connectée',
        {
          path: request.path,
          method: request.method,
          duration: latency,
        },
      );
    } catch (error) {
      const latency = Date.now() - startTime;

      return ApiResponseHelper.success(
        {
          status: 'unhealthy',
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
          latency: `${latency}ms`,
        },
        'Erreur de connexion à la base de données',
        {
          path: request.path,
          method: request.method,
          duration: latency,
        },
      );
    }
  }
}
