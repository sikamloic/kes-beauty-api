import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { SearchProvidersDto, PublicAvailabilityDto } from './dto';
import { Public } from '../common';

/**
 * Contrôleur Client
 * 
 * Endpoints publics pour la recherche et consultation des providers
 */
@ApiTags('Clients - Recherche')
@Controller('search')
@Public()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * GET /search/providers
   * Rechercher des providers avec filtres
   */
  @Get('providers')
  @ApiOperation({
    summary: 'Rechercher des providers',
    description: 'Recherche avec filtres: ville, catégorie, prix, note, proximité',
  })
  async searchProviders(@Query() filters: SearchProvidersDto) {
    return this.clientsService.searchProviders(filters);
  }

  /**
   * GET /search/providers/popular
   * Providers populaires
   */
  @Get('providers/popular')
  @ApiOperation({
    summary: 'Providers populaires',
    description: 'Liste des providers les mieux notés',
  })
  @ApiQuery({ name: 'city', required: false, description: 'Filtrer par ville' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre (défaut: 10)' })
  async getPopularProviders(
    @Query('city') city?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.clientsService.getPopularProviders(city, limit || 10);
  }

  /**
   * GET /search/providers/nearby
   * Providers à proximité
   */
  @Get('providers/nearby')
  @ApiOperation({
    summary: 'Providers à proximité',
    description: 'Recherche par géolocalisation',
  })
  @ApiQuery({ name: 'latitude', required: true, type: Number })
  @ApiQuery({ name: 'longitude', required: true, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'Rayon en km (défaut: 10)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre (défaut: 20)' })
  async getNearbyProviders(
    @Query('latitude', ParseIntPipe) latitude: number,
    @Query('longitude', ParseIntPipe) longitude: number,
    @Query('radius', new ParseIntPipe({ optional: true })) radius?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.clientsService.getNearbyProviders(
      latitude,
      longitude,
      radius || 10,
      limit || 20,
    );
  }

  /**
   * GET /search/providers/:id
   * Détails d'un provider
   */
  @Get('providers/:id')
  @ApiOperation({
    summary: 'Détails d\'un provider',
    description: 'Informations complètes du provider (profil, stats, spécialités)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID du provider' })
  async getProviderDetails(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.parseLocale(acceptLanguage);
    return this.clientsService.getProviderDetails(id, locale);
  }

  /**
   * GET /search/providers/:id/services
   * Services d'un provider
   */
  @Get('providers/:id/services')
  @ApiOperation({
    summary: 'Services d\'un provider',
    description: 'Liste des services groupés par catégorie',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID du provider' })
  async getProviderServices(
    @Param('id', ParseIntPipe) id: number,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.parseLocale(acceptLanguage);
    return this.clientsService.getProviderServices(id, locale);
  }

  /**
   * GET /search/providers/:id/availability
   * Disponibilités d'un provider
   */
  @Get('providers/:id/availability')
  @ApiOperation({
    summary: 'Disponibilités d\'un provider',
    description: 'Créneaux disponibles pour réservation',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID du provider' })
  async getProviderAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query() filters: PublicAvailabilityDto,
  ) {
    return this.clientsService.getProviderAvailability(id, filters);
  }

  /**
   * Parse le header Accept-Language pour extraire la locale
   */
  private parseLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) return 'fr';
    const locale = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    return ['fr', 'en'].includes(locale || '') ? locale! : 'fr';
  }
}
