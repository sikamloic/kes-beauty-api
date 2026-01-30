import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { UpdateClientProfileDto } from './dto';
import { Roles, JwtAuthGuard, RolesGuard } from '../common';

/**
 * Contrôleur Profil Client
 * 
 * Endpoints protégés pour la gestion du profil client
 */
@ApiTags('Clients - Profil')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientsProfileController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * GET /clients/profile
   * Récupérer mon profil
   */
  @Get('profile')
  @Roles('client')
  @ApiOperation({
    summary: 'Mon profil',
    description: 'Récupérer les informations du profil client connecté',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil récupéré avec succès',
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          phone: '+237655123456',
          phoneVerified: true,
          firstName: 'Marie',
          lastName: 'Dupont',
          dateOfBirth: '1990-05-15',
          preferences: {
            preferredCity: 'Douala',
            notifications: { sms: true, email: false },
          },
          createdAt: '2025-01-15T10:00:00.000Z',
          updatedAt: '2025-01-20T14:30:00.000Z',
        },
      },
    },
  })
  async getProfile(@Req() req: any) {
    return this.clientsService.getProfile(req.user.userId);
  }

  /**
   * PATCH /clients/profile
   * Mettre à jour mon profil
   */
  @Patch('profile')
  @Roles('client')
  @ApiOperation({
    summary: 'Mettre à jour mon profil',
    description: 'Modifier les informations du profil client (firstName, lastName, dateOfBirth, preferences)',
  })
  @ApiResponse({
    status: 200,
    description: 'Profil mis à jour avec succès',
  })
  async updateProfile(@Req() req: any, @Body() dto: UpdateClientProfileDto) {
    return this.clientsService.updateProfile(req.user.userId, dto);
  }
}
