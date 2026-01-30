import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * Tri des résultats de recherche
 */
export enum ProviderSortBy {
  RATING = 'rating',
  DISTANCE = 'distance',
  PRICE = 'price',
  POPULARITY = 'popularity',
  NEWEST = 'newest',
}

/**
 * DTO pour la recherche de providers
 */
export class SearchProvidersDto {
  @ApiPropertyOptional({ description: 'Recherche textuelle (nom, service)' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filtrer par ville' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filtrer par quartier' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'Filtrer par catégorie de service' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filtrer par type de business' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  businessTypeId?: number;

  @ApiPropertyOptional({ description: 'Prix minimum (FCFA)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Prix maximum (FCFA)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Note minimum (1-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ description: 'Latitude pour recherche par proximité' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude pour recherche par proximité' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Rayon de recherche en km (défaut: 10)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number = 10;

  @ApiPropertyOptional({ enum: ProviderSortBy, default: ProviderSortBy.RATING })
  @IsOptional()
  @IsEnum(ProviderSortBy)
  sortBy?: ProviderSortBy = ProviderSortBy.RATING;

  @ApiPropertyOptional({ description: 'Filtrer les providers disponibles maintenant' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  availableNow?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer les providers qui se déplacent à domicile' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  homeService?: boolean;

  @ApiPropertyOptional({ description: 'Filtrer les providers vérifiés (identité confirmée)' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'Page (défaut: 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Éléments par page (défaut: 10, max: 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

/**
 * DTO pour les filtres de disponibilités publiques
 */
export class PublicAvailabilityDto {
  @ApiPropertyOptional({ description: 'Date de début (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'ID du service pour calculer les créneaux disponibles' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  serviceId?: number;
}
