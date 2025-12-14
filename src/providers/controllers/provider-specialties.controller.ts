import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProviderSpecialtiesService } from '../services/provider-specialties.service';
import { AddSpecialtyDto, AddSpecialtiesBulkDto, UpdateSpecialtyDto } from '../dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

/**
 * Contrôleur Spécialités Provider
 * Gestion des spécialités/compétences des providers
 */
@ApiTags('Provider Specialties')
@Controller('providers/specialties')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@ApiBearerAuth()
export class ProviderSpecialtiesController {
  constructor(
    private readonly specialtiesService: ProviderSpecialtiesService,
  ) {}

  /**
   * GET /providers/specialties
   * Liste des spécialités du provider
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des spécialités',
    description:
      'Récupère toutes les spécialités du provider authentifié avec badges.',
  })
  async findAll(@Req() request: any) {
    const providerId = request.user.providerId;
    return this.specialtiesService.findAll(providerId);
  }

  /**
   * POST /providers/specialties
   * Ajouter une spécialité
   */
  @Post()
  @ApiOperation({
    summary: 'Ajouter une spécialité',
    description:
      'Déclare une nouvelle spécialité/compétence pour le provider.',
  })
  async add(@Req() request: any, @Body() dto: AddSpecialtyDto) {
    const providerId = request.user.providerId;
    return this.specialtiesService.add(providerId, dto);
  }

  /**
   * POST /providers/specialties/bulk
   * Ajouter plusieurs spécialités en une fois
   */
  @Post('bulk')
  @ApiOperation({
    summary: 'Ajouter plusieurs spécialités (bulk)',
    description:
      'Ajoute plusieurs spécialités en une seule requête (max 10). Toutes les opérations sont effectuées en transaction.',
  })
  async addBulk(@Req() request: any, @Body() dto: AddSpecialtiesBulkDto) {
    const providerId = request.user.providerId;
    return this.specialtiesService.addBulk(providerId, dto);
  }

  /**
   * PUT /providers/specialties/:id
   * Mettre à jour une spécialité
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour une spécialité',
    description: 'Modifie les années d\'expérience ou le statut principal.',
  })
  async update(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    const providerId = request.user.providerId;
    return this.specialtiesService.update(id, providerId, dto);
  }

  /**
   * DELETE /providers/specialties/:id
   * Supprimer une spécialité
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer une spécialité',
    description: 'Retire une spécialité du profil provider.',
  })
  async remove(@Req() request: any, @Param('id', ParseIntPipe) id: number) {
    const providerId = request.user.providerId;
    return this.specialtiesService.remove(id, providerId);
  }
}
