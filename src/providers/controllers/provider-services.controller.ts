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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery } from '@nestjs/swagger';
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
    description: 'Récupère tous les services du provider authentifié avec pagination.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean, description: 'Inclure les services inactifs (défaut: false)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre par page (défaut: 20, max: 100)' })
  async findAll(
    @Req() request: { user: { providerId: number } },
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const providerId = request.user.providerId;
    const parsedPage = Math.max(parseInt(page || '1', 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit || '20', 10) || 20, 1), 100);
    const includeInactiveFlag = includeInactive === 'true';

    return this.providerServicesService.findAllByProvider(
      providerId,
      includeInactiveFlag,
      parsedPage,
      parsedLimit,
    );
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
   * GET /providers/services/popular
   * Services les plus populaires (endpoint public)
   */
  @Public()
  @Get('popular')
  @ApiOperation({
    summary: 'Services populaires',
    description: 'Récupère les services les plus réservés avec filtres optionnels. Endpoint public.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de services (défaut: 10, max: 50)', example: 10 })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: 'Filtrer par catégorie', example: 1 })
  @ApiQuery({ name: 'city', required: false, type: String, description: 'Filtrer par ville', example: 'Yaoundé' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Prix minimum (FCFA)', example: 1000 })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Prix maximum (FCFA)', example: 50000 })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number, description: 'Durée maximum (minutes)', example: 120 })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description: 'Langue souhaitée (fr, en). Défaut: fr',
    example: 'fr',
  })
  async getPopularServices(
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('maxDuration') maxDuration?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.parseLocale(acceptLanguage);
    const parsedLimit = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);
    
    const filters = {
      categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
      city: city || undefined,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration, 10) : undefined,
    };

    return this.providerServicesService.getPopularServices(parsedLimit, locale, filters);
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
   * Parse Accept-Language header
   */
  private parseLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) return 'fr';
    const primary = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    const supportedLocales = ['fr', 'en'];
    return primary && supportedLocales.includes(primary) ? primary : 'fr';
  }
}
