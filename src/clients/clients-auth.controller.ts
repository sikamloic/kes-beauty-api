import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { RegisterClientDto } from './dto';
import {
  ApiStandardErrors,
  ApiConflictResponse,
  ApiCreatedResponse,
} from '../common';

/**
 * Contrôleur Inscription Client
 * 
 * Endpoint public pour l'inscription des clients
 */
@ApiTags('Clients')
@Controller('clients')
@UseGuards(ThrottlerGuard)
export class ClientsAuthController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * POST /clients/register
   * Inscription client
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'Inscription client',
    description: 'Créer un compte client. Après inscription, vérifier le téléphone par SMS.',
  })
  @ApiCreatedResponse(
    'Client créé avec succès',
    undefined,
    {
      user: {
        clientId: 1,
        firstName: 'Jean',
        lastName: 'Kamga',
        phone: '+237655443322',
        status: 'pending_verification',
      },
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 900,
      message: 'Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS.',
    },
  )
  @ApiConflictResponse('Téléphone déjà utilisé')
  @ApiStandardErrors()
  async register(@Body() dto: RegisterClientDto) {
    return this.clientsService.register(dto);
  }
}
