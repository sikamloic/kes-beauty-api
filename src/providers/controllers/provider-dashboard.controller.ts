import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProviderDashboardService } from '../services/provider-dashboard.service';
import { DashboardFiltersDto } from '../dto';
import { JwtAuthGuard, Roles, RolesGuard, AuthenticatedRequest } from '../../common';

/**
 * Contrôleur Dashboard Provider
 * Endpoints pour le tableau de bord du provider
 */
@ApiTags('Provider Dashboard')
@Controller('providers/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@ApiBearerAuth()
export class ProviderDashboardController {
  constructor(private readonly dashboardService: ProviderDashboardService) {}

  /**
   * Valider que le providerId est présent dans le token
   */
  private validateProviderId(req: AuthenticatedRequest): number {
    if (!req.user?.providerId) {
      throw new UnauthorizedException('Provider ID manquant dans le token');
    }
    return req.user.providerId;
  }

  /**
   * GET /providers/dashboard/summary
   * Résumé global du dashboard
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Résumé du dashboard',
    description: 'Statistiques globales, RDV du jour, et compteur de RDV en attente',
  })
  async getSummary(@Req() req: AuthenticatedRequest) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getSummary(providerId);
  }

  /**
   * GET /providers/dashboard/statistics
   * Statistiques globales du provider
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Statistiques globales',
    description: 'Rating moyen, nombre de reviews, bookings, etc.',
  })
  async getStatistics(@Req() req: AuthenticatedRequest) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getStatistics(providerId);
  }

  /**
   * GET /providers/dashboard/revenue
   * Statistiques de revenus
   */
  @Get('revenue')
  @ApiOperation({
    summary: 'Statistiques de revenus',
    description: 'Revenus totaux, par jour, moyenne par RDV',
  })
  async getRevenueStats(@Req() req: AuthenticatedRequest, @Query() filters: DashboardFiltersDto) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getRevenueStats(providerId, filters);
  }

  /**
   * GET /providers/dashboard/appointment-stats
   * Statistiques des rendez-vous par statut
   */
  @Get('appointment-stats')
  @ApiOperation({
    summary: 'Statistiques des rendez-vous',
    description: 'Nombre de RDV par statut sur la période',
  })
  async getAppointmentStats(@Req() req: AuthenticatedRequest, @Query() filters: DashboardFiltersDto) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getAppointmentStats(providerId, filters);
  }

  /**
   * GET /providers/dashboard/upcoming
   * Prochains rendez-vous
   */
  @Get('upcoming')
  @ApiOperation({
    summary: 'Prochains rendez-vous',
    description: 'Liste des prochains RDV confirmés ou en attente',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de RDV (défaut: 5)' })
  async getUpcomingAppointments(
    @Req() req: AuthenticatedRequest,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getUpcomingAppointments(providerId, limit);
  }

  /**
   * GET /providers/dashboard/top-services
   * Services les plus populaires
   */
  @Get('top-services')
  @ApiOperation({
    summary: 'Services les plus populaires',
    description: 'Top services par nombre de réservations',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de services (défaut: 5)' })
  async getTopServices(
    @Req() req: AuthenticatedRequest,
    @Query() filters: DashboardFiltersDto,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getTopServices(providerId, filters, limit);
  }

  /**
   * GET /providers/dashboard/today
   * Rendez-vous du jour
   */
  @Get('today')
  @ApiOperation({
    summary: 'Rendez-vous du jour',
    description: 'Liste des RDV prévus aujourd\'hui',
  })
  async getTodayAppointments(@Req() req: AuthenticatedRequest) {
    const providerId = this.validateProviderId(req);
    return this.dashboardService.getTodayAppointments(providerId);
  }
}
