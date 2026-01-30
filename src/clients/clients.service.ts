import { Injectable } from '@nestjs/common';
import { SearchProvidersDto, PublicAvailabilityDto, RegisterClientDto, UpdateClientProfileDto } from './dto';
import { ClientRegistrationService, ClientProfileService, ProviderSearchService } from './services';

/**
 * Service Client (Façade)
 * 
 * Délègue aux services spécialisés pour respecter SRP:
 * - ClientRegistrationService: Inscription
 * - ClientProfileService: Gestion profil
 * - ProviderSearchService: Recherche providers
 */
@Injectable()
export class ClientsService {
  constructor(
    private readonly registration: ClientRegistrationService,
    private readonly profile: ClientProfileService,
    private readonly providerSearch: ProviderSearchService,
  ) {}

  // ==================== INSCRIPTION ====================

  async register(dto: RegisterClientDto) {
    return this.registration.register(dto);
  }

  // ==================== PROFIL CLIENT ====================

  async getProfile(userId: number) {
    return this.profile.getProfile(userId);
  }

  async updateProfile(userId: number, dto: UpdateClientProfileDto) {
    return this.profile.updateProfile(userId, dto);
  }

  // ==================== RECHERCHE PROVIDERS ====================

  async searchProviders(filters: SearchProvidersDto) {
    return this.providerSearch.searchProviders(filters);
  }

  async getProviderDetails(providerId: number, locale: string = 'fr') {
    return this.providerSearch.getProviderDetails(providerId, locale);
  }

  async getProviderServices(providerId: number, locale: string = 'fr') {
    return this.providerSearch.getProviderServices(providerId, locale);
  }

  async getProviderAvailability(providerId: number, filters: PublicAvailabilityDto) {
    return this.providerSearch.getProviderAvailability(providerId, filters);
  }

  async getPopularProviders(city?: string, limit: number = 10) {
    return this.providerSearch.getPopularProviders(city, limit);
  }

  async getNearbyProviders(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
  ) {
    return this.providerSearch.getNearbyProviders(latitude, longitude, radiusKm, limit);
  }
}
