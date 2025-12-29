import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { ProfileCompletionService } from './services/profile-completion.service';
import { RegisterProviderDto, UpdateProviderDto } from './dto';
import {
  ApiStandardErrors,
  ApiConflictResponse,
  ApiCreatedResponse,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../common';

/**
 * Controller Provider - P0.1 Inscription & Validation
 * Principe SOLID: SRP - Responsabilité unique = gestion endpoints HTTP
 */
@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly profileCompletionService: ProfileCompletionService,
  ) {}

  /**
   * POST /providers/register
   * Inscription provider - VERSION SIMPLIFIÉE
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inscription provider (simplifiée)',
    description:
      'Inscription rapide <2 minutes. Infos requises: nom, téléphone, mot de passe, ville. Le reste sera complété après validation.',
  })
  @ApiCreatedResponse(
    'Provider créé avec succès',
    undefined,
    {
      userId: 1,
      providerId: 1,
      fullName: 'Marie Dupont',
      phone: '+237600000000',
      city: 'Douala',
      status: 'pending_verification',
      message:
        'Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS.',
    },
  )
  @ApiConflictResponse('Téléphone déjà utilisé')
  @ApiStandardErrors()
  async register(@Body() dto: RegisterProviderDto) {
    return this.providersService.register(dto);
  }

  /**
   * GET /providers/profile
   * Récupérer les infos du provider connecté
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Profil du provider connecté',
    description: 'Récupère toutes les informations du provider authentifié.',
  })
  async getProfile(@Req() request: any) {
    const providerId = request.user.providerId;
    return this.providersService.getProfile(providerId);
  }

  /**
   * PUT /providers/profile
   * Mettre à jour le profil du provider connecté
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mettre à jour le profil',
    description: 'Permet au provider de compléter/modifier son profil.',
  })
  async updateProfile(
    @Req() request: any,
    @Body() dto: UpdateProviderDto,
  ) {
    const providerId = request.user.providerId;
    const userId = request.user.userId;
    return this.providersService.updateProfile(providerId, userId, dto);
  }

  /**
   * GET /providers/profile/completion
   * Taux de complétion du profil avec recommandations
   */
  @Get('profile/completion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Taux de complétion du profil',
    description: 'Retourne le pourcentage de complétion, les critères manquants et les prochaines étapes recommandées.',
  })
  async getProfileCompletion(@Req() request: any) {
    const providerId = request.user.providerId;
    return this.profileCompletionService.getProfileCompletion(providerId);
  }
}

