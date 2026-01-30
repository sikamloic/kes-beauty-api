import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, ValidateIf, IsNotEmpty } from 'class-validator';
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
 * 
 * Note: startDate et endDate sont requis si period = 'custom'
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
    description: 'Date de début (requis si period=custom)',
    example: '2025-01-01',
  })
  @ValidateIf((o) => o.period === DashboardPeriod.CUSTOM)
  @IsNotEmpty({ message: 'startDate est requis pour une période custom' })
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Date de fin (requis si period=custom)',
    example: '2025-01-31',
  })
  @ValidateIf((o) => o.period === DashboardPeriod.CUSTOM)
  @IsNotEmpty({ message: 'endDate est requis pour une période custom' })
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
