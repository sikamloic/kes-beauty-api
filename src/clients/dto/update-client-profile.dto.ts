import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';

/**
 * DTO pour la mise à jour du profil client
 */
export class UpdateClientProfileDto {
  @ApiPropertyOptional({
    description: 'Prénom du client',
    example: 'Marie',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Nom de famille du client',
    example: 'Dupont',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Date de naissance (YYYY-MM-DD)',
    example: '1990-05-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Préférences du client (JSON libre)',
    example: {
      preferredCity: 'Douala',
      preferredCategories: [1, 2],
      notifications: { sms: true, email: false },
    },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, any>;
}
