import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProviderAvailabilityService } from '../services/provider-availability.service';
import {
  SetWeeklyAvailabilityDto,
  CreateAvailabilityExceptionDto,
  UpdateAvailabilityExceptionDto,
} from '../dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

/**
 * Contrôleur Disponibilités Provider
 * Gestion des horaires et exceptions
 */
@ApiTags('Provider Availability')
@Controller('providers/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@ApiBearerAuth()
export class ProviderAvailabilityController {
  constructor(
    private readonly availabilityService: ProviderAvailabilityService,
  ) {}

  /**
   * POST /providers/availability/weekly
   * Définir les disponibilités hebdomadaires
   */
  @Post('weekly')
  @ApiOperation({
    summary: 'Définir disponibilités hebdomadaires',
    description:
      'Définit les horaires réguliers de la semaine. Remplace toutes les disponibilités existantes.',
  })
  async setWeeklyAvailability(
    @Req() request: any,
    @Body() dto: SetWeeklyAvailabilityDto,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.setWeeklyAvailability(providerId, dto);
  }

  /**
   * GET /providers/availability/weekly
   * Récupérer les disponibilités hebdomadaires
   */
  @Get('weekly')
  @ApiOperation({
    summary: 'Récupérer disponibilités hebdomadaires',
    description: 'Récupère les horaires réguliers de la semaine.',
  })
  async getWeeklyAvailability(@Req() request: any) {
    const providerId = request.user.providerId;
    return this.availabilityService.getWeeklyAvailability(providerId);
  }

  /**
   * PUT /providers/availability/weekly/day/:dayOfWeek/toggle
   * Activer/désactiver un jour
   */
  @Put('weekly/day/:dayOfWeek/toggle')
  @ApiOperation({
    summary: 'Activer/désactiver un jour',
    description: 'Active ou désactive tous les créneaux d\'un jour spécifique.',
  })
  async toggleDay(
    @Req() request: any,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Body('isActive') isActive: boolean,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.toggleDay(providerId, dayOfWeek, isActive);
  }

  /**
   * POST /providers/availability/exceptions
   * Créer une exception
   */
  @Post('exceptions')
  @ApiOperation({
    summary: 'Créer une exception',
    description:
      'Crée une exception aux horaires réguliers (congé, horaires spéciaux, etc.).',
  })
  async createException(
    @Req() request: any,
    @Body() dto: CreateAvailabilityExceptionDto,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.createException(providerId, dto);
  }

  /**
   * GET /providers/availability/exceptions
   * Liste des exceptions
   */
  @Get('exceptions')
  @ApiOperation({
    summary: 'Liste des exceptions',
    description:
      'Récupère toutes les exceptions aux horaires réguliers, avec filtrage optionnel par période.',
  })
  async getExceptions(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.getExceptions(
      providerId,
      startDate,
      endDate,
    );
  }

  /**
   * PUT /providers/availability/exceptions/:id
   * Mettre à jour une exception
   */
  @Put('exceptions/:id')
  @ApiOperation({
    summary: 'Mettre à jour une exception',
    description: 'Modifie une exception existante.',
  })
  async updateException(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityExceptionDto,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.updateException(id, providerId, dto);
  }

  /**
   * DELETE /providers/availability/exceptions/:id
   * Supprimer une exception
   */
  @Delete('exceptions/:id')
  @ApiOperation({
    summary: 'Supprimer une exception',
    description: 'Supprime une exception aux horaires réguliers.',
  })
  async deleteException(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.deleteException(id, providerId);
  }
}
