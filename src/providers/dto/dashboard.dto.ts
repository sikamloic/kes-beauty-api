import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Période pour les statistiques du dashboard
 */
export enum DashboardPeriod {
  TODAY = 'today',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
  CUSTOM = 'custom',
}

/**
 * DTO pour les filtres du dashboard provider
 */
export class DashboardFiltersDto {
  @ApiPropertyOptional({
    description: 'Période prédéfinie',
    enum: DashboardPeriod,
    default: DashboardPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.MONTH;

  @ApiPropertyOptional({
    description: 'Date de début (pour période custom)',
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (pour période custom)',
    example: '2025-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

/**
 * DTO pour les statistiques de revenus
 */
export class RevenueStatsDto {
  @ApiPropertyOptional({
    description: 'Nombre de jours pour le graphique',
    default: 7,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  days?: number = 7;
}
