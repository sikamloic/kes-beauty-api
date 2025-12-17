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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProviderAvailabilityService } from '../services/provider-availability.service';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from '../dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

/**
 * Contrôleur Disponibilités Provider
 * Gestion flexible des créneaux par date
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
   * POST /providers/availability
   * Créer un créneau de disponibilité
   */
  @Post()
  @ApiOperation({
    summary: 'Créer un créneau de disponibilité',
    description:
      'Crée un créneau pour une date précise. Plusieurs créneaux possibles par date (sans chevauchement).',
  })
  async create(@Req() request: any, @Body() dto: CreateAvailabilityDto) {
    const providerId = request.user.providerId;
    return this.availabilityService.create(providerId, dto);
  }

  /**
   * GET /providers/availability
   * Liste des disponibilités
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des disponibilités',
    description: 'Récupère tous les créneaux, avec filtrage optionnel par période.',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Date début (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Date fin (YYYY-MM-DD)' })
  async findAll(
    @Req() request: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.findAll(providerId, startDate, endDate);
  }

  /**
   * GET /providers/availability/:id
   * Récupérer une disponibilité
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Récupérer une disponibilité',
    description: 'Récupère un créneau par son ID.',
  })
  async findOne(@Req() request: any, @Param('id', ParseIntPipe) id: number) {
    const providerId = request.user.providerId;
    return this.availabilityService.findOne(id, providerId);
  }

  /**
   * PUT /providers/availability/:id
   * Mettre à jour une disponibilité
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour une disponibilité',
    description: 'Modifie un créneau existant.',
  })
  async update(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const providerId = request.user.providerId;
    return this.availabilityService.update(id, providerId, dto);
  }

  /**
   * DELETE /providers/availability/:id
   * Supprimer une disponibilité
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une disponibilité',
    description: 'Supprime un créneau.',
  })
  async delete(@Req() request: any, @Param('id', ParseIntPipe) id: number) {
    const providerId = request.user.providerId;
    return this.availabilityService.delete(id, providerId);
  }

  /**
   * DELETE /providers/availability/date/:date
   * Supprimer toutes les disponibilités d'une date
   */
  @Delete('date/:date')
  @ApiOperation({
    summary: 'Supprimer les disponibilités d\'une date',
    description: 'Supprime tous les créneaux d\'une date précise.',
  })
  async deleteByDate(@Req() request: any, @Param('date') date: string) {
    const providerId = request.user.providerId;
    return this.availabilityService.deleteByDate(providerId, date);
  }
}
