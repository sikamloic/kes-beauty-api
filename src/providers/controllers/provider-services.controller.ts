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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { ProviderServicesService } from '../services/provider-services.service';
import { CreateServiceDto, UpdateServiceDto } from '../dto';
import { JwtAuthGuard, Roles, RolesGuard, Public } from '../../common';

/**
 * Contrôleur Services Provider
 * Gestion des services proposés par les providers
 */
@ApiTags('Provider Services')
@Controller('providers/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@ApiBearerAuth()
export class ProviderServicesController {
  constructor(
    private readonly providerServicesService: ProviderServicesService,
  ) {}

  /**
   * GET /providers/services
   * Liste des services du provider connecté
   */
  @Get()
  @ApiOperation({
    summary: 'Liste des services',
    description: 'Récupère tous les services du provider authentifié.',
  })
  async findAll(@Req() request: any) {
    const providerId = request.user.providerId;
    return this.providerServicesService.findAllByProvider(providerId);
  }

  /**
   * POST /providers/services
   * Créer un nouveau service
   */
  @Post()
  @ApiOperation({
    summary: 'Créer un service',
    description: 'Ajoute un nouveau service au catalogue du provider.',
  })
  async create(@Req() request: any, @Body() dto: CreateServiceDto) {
    const providerId = request.user.providerId;
    return this.providerServicesService.create(providerId, dto);
  }

  /**
   * GET /providers/services/:id
   * Détails d'un service
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Détails d\'un service',
    description: 'Récupère les détails d\'un service spécifique.',
  })
  async findOne(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const providerId = request.user.providerId;
    return this.providerServicesService.findOne(id, providerId);
  }

  /**
   * PUT /providers/services/:id
   * Mettre à jour un service
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour un service',
    description: 'Modifie les informations d\'un service existant.',
  })
  async update(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    const providerId = request.user.providerId;
    return this.providerServicesService.update(id, providerId, dto);
  }

  /**
   * DELETE /providers/services/:id
   * Supprimer un service
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un service',
    description: 'Supprime un service du catalogue (soft delete).',
  })
  async remove(
    @Req() request: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const providerId = request.user.providerId;
    return this.providerServicesService.remove(id, providerId);
  }

  /**
   * GET /providers/services/categories/list
   * Liste des catégories disponibles (endpoint public)
   */
  @Public()
  @Get('categories/list')
  @ApiOperation({
    summary: 'Liste des catégories',
    description: 'Récupère toutes les catégories de services disponibles avec traductions. Endpoint public, pas d\'authentification requise.',
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Langue souhaitée (fr, en). Défaut: fr',
    example: 'fr',
  })
  async getCategories(@Headers('accept-language') acceptLanguage?: string) {
    const locale = this.parseLocale(acceptLanguage);
    return this.providerServicesService.getCategories(locale);
  }

  /**
   * Parse Accept-Language header
   */
  private parseLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) return 'fr';
    const primary = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    const supportedLocales = ['fr', 'en'];
    return primary && supportedLocales.includes(primary) ? primary : 'fr';
  }
}
