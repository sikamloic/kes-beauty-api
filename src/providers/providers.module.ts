import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { ProviderServicesService } from './services/provider-services.service';
import { ProviderSpecialtiesService } from './services/provider-specialties.service';
import { ProviderAvailabilityService } from './services/provider-availability.service';
import { AppointmentsService } from './services/appointments.service';
import { ProviderServicesController } from './controllers/provider-services.controller';
import { ProviderSpecialtiesController } from './controllers/provider-specialties.controller';
import { ProviderAvailabilityController } from './controllers/provider-availability.controller';
import { AppointmentsController } from './controllers/appointments.controller';
import { BusinessTypesController } from './controllers/business-types.controller';
import {
  ProviderValidatorService,
  ProviderRepositoryService,
} from './shared';
import { AuthModule } from '../auth';

/**
 * Module Provider
 * 
 * Enregistre:
 * - Module shared services (validator, repository)
 * - Feature services (providers, services, specialties, availability)
 * 
 * Note: Common services (JWT, Phone, SMS) fournis par CommonModule (@Global)
 * Note: RefreshTokenService fourni par AuthModule
 */
@Module({
  imports: [AuthModule],
  providers: [
    // Module shared services
    ProviderValidatorService,
    ProviderRepositoryService,
    
    // Feature services
    ProvidersService,
    ProviderServicesService,
    ProviderSpecialtiesService,
    ProviderAvailabilityService,
    AppointmentsService,
  ],
  controllers: [
    ProvidersController,
    ProviderServicesController,
    ProviderSpecialtiesController,
    ProviderAvailabilityController,
    AppointmentsController,
    BusinessTypesController,
  ],
  exports: [
    // Exporter pour autres modules si besoin
    ProviderValidatorService,
    ProviderRepositoryService,
    ProviderServicesService,
    ProviderSpecialtiesService,
    ProviderAvailabilityService,
  ],
})
export class ProvidersModule {}
