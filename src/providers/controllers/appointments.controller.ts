import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AppointmentsService } from '../services/appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
  FilterAppointmentsDto,
  StartAppointmentDto,
} from '../dto';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common';

/**
 * Contrôleur Appointments
 * Gestion des rendez-vous (clients + providers)
 */
@ApiTags('Appointments')
@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * POST /appointments
   * Créer un rendez-vous (CLIENT)
   */
  @Post()
  @Roles('client')
  @ApiOperation({
    summary: 'Créer un rendez-vous',
    description: 'Le client réserve un créneau chez un provider',
  })
  async create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user.userId, dto);
  }

  /**
   * GET /appointments/my
   * Lister mes rendez-vous (CLIENT)
   */
  @Get('my')
  @Roles('client')
  @ApiOperation({
    summary: 'Mes rendez-vous (client)',
    description: 'Liste des rendez-vous du client connecté',
  })
  async getMyAppointments(
    @Req() req: any,
    @Query() filters: FilterAppointmentsDto,
  ) {
    return this.appointmentsService.findByClient(req.user.userId, filters);
  }

  /**
   * GET /appointments/provider
   * Lister les rendez-vous du provider (PROVIDER)
   */
  @Get('provider')
  @Roles('provider')
  @ApiOperation({
    summary: 'Rendez-vous du provider',
    description: 'Liste des rendez-vous du provider connecté',
  })
  async getProviderAppointments(
    @Req() req: any,
    @Query() filters: FilterAppointmentsDto,
  ) {
    return this.appointmentsService.findByProvider(
      req.user.providerId,
      filters,
    );
  }

  /**
   * GET /appointments/:id
   * Détails d'un rendez-vous
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Détails d\'un rendez-vous',
    description: 'Récupérer les détails complets d\'un rendez-vous',
  })
  async getOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.appointmentsService.findOne(
      id,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * PATCH /appointments/:id/status
   * Mettre à jour le statut (PROVIDER)
   */
  @Patch(':id/status')
  @Roles('provider')
  @ApiOperation({
    summary: 'Mettre à jour le statut',
    description: 'Le provider confirme, démarre, termine ou annule un rendez-vous',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      req.user.providerId,
      req.user.userId,
      dto,
    );
  }

  /**
   * PATCH /appointments/:id/cancel
   * Annuler un rendez-vous (CLIENT)
   */
  @Patch(':id/cancel')
  @Roles('client')
  @ApiOperation({
    summary: 'Annuler un rendez-vous',
    description: 'Le client annule son rendez-vous (minimum 24h avant)',
  })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    return this.appointmentsService.cancelByClient(
      id,
      req.user.userId,
      reason,
    );
  }

  /**
   * POST /appointments/:id/start
   * Démarrer une prestation avec le code de confirmation (PROVIDER)
   */
  @Post(':id/start')
  @Roles('provider')
  @ApiOperation({
    summary: 'Démarrer une prestation',
    description: 'Le provider entre le code à 4 chiffres donné par le client pour démarrer la prestation',
  })
  async startWithCode(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() dto: StartAppointmentDto,
  ) {
    return this.appointmentsService.startWithCode(
      id,
      req.user.providerId,
      dto.code,
    );
  }

  /**
   * POST /appointments/:id/complete
   * Terminer une prestation (PROVIDER)
   */
  @Post(':id/complete')
  @Roles('provider')
  @ApiOperation({
    summary: 'Terminer une prestation',
    description: 'Le provider signale la fin de la prestation',
  })
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.appointmentsService.completeAppointment(
      id,
      req.user.providerId,
    );
  }
}
