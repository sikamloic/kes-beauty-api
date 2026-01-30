import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsAuthController } from './clients-auth.controller';
import { ClientsProfileController } from './clients-profile.controller';
import { ClientsService } from './clients.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Module Clients
 * 
 * Gère les fonctionnalités pour les clients :
 * - Inscription client
 * - Gestion du profil client
 * - Recherche de providers
 * - Consultation des profils, services, disponibilités
 */
@Module({
  imports: [AuthModule],
  controllers: [ClientsController, ClientsAuthController, ClientsProfileController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
