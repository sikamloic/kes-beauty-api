import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

/**
 * Module Clients
 * 
 * Gère les fonctionnalités publiques pour les clients :
 * - Recherche de providers
 * - Consultation des profils, services, disponibilités
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
