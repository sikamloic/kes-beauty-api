import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsAuthController } from './clients-auth.controller';
import { ClientsProfileController } from './clients-profile.controller';
import { ClientsService } from './clients.service';
import { ClientRegistrationService, ClientProfileService, ProviderSearchService } from './services';
import { AuthModule } from '../auth/auth.module';

/**
 * Module Clients
 * 
 * Gère les fonctionnalités pour les clients :
 * - Inscription client (ClientRegistrationService)
 * - Gestion du profil client (ClientProfileService)
 * - Recherche de providers (ProviderSearchService)
 */
@Module({
  imports: [AuthModule],
  controllers: [ClientsController, ClientsAuthController, ClientsProfileController],
  providers: [
    ClientsService,
    ClientRegistrationService,
    ClientProfileService,
    ProviderSearchService,
  ],
  exports: [
    ClientsService,
    ClientRegistrationService,
    ClientProfileService,
    ProviderSearchService,
  ],
})
export class ClientsModule {}
