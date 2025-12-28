import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProviderDashboardService } from '../services/provider-dashboard.service';
import { DashboardFiltersDto } from '../dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

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
   * GET /providers/dashboard/summary
   * Résumé global du dashboard
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Résumé du dashboard',
    description: 'Statistiques globales, RDV du jour, et compteur de RDV en attente',
  })
  async getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user.providerId);
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
  async getStatistics(@Req() req: any) {
    return this.dashboardService.getStatistics(req.user.providerId);
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
  async getRevenueStats(@Req() req: any, @Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getRevenueStats(req.user.providerId, filters);
  }

  /**
   * GET /providers/dashboard/appointments
   * Statistiques des rendez-vous par statut
   */
  @Get('appointments')
  @ApiOperation({
    summary: 'Statistiques des rendez-vous',
    description: 'Nombre de RDV par statut sur la période',
  })
  async getAppointmentStats(@Req() req: any, @Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getAppointmentStats(req.user.providerId, filters);
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
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getUpcomingAppointments(req.user.providerId, limit);
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
    @Req() req: any,
    @Query() filters: DashboardFiltersDto,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getTopServices(req.user.providerId, filters, limit);
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
  async getTodayAppointments(@Req() req: any) {
    return this.dashboardService.getTodayAppointments(req.user.providerId);
  }
}
