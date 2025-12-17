import {
  IsString,
  IsDateString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour créer une disponibilité (créneau pour une date précise)
 */
export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Date du créneau (format YYYY-MM-DD, doit être >= aujourd\'hui)',
    example: '2024-12-25',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Heure de début (format HH:mm)',
    example: '09:35',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 09:35)',
  })
  startTime!: string;

  @ApiProperty({
    description: 'Heure de fin (format HH:mm)',
    example: '11:49',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 11:49)',
  })
  endTime!: string;

  @ApiProperty({
    description: 'Disponible (true) ou bloqué (false)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({
    description: 'Raison (optionnel)',
    example: 'Congé annuel',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO pour mettre à jour une disponibilité
 */
export class UpdateAvailabilityDto {
  @ApiProperty({
    description: 'Heure de début (format HH:mm)',
    example: '10:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 10:00)',
  })
  startTime?: string;

  @ApiProperty({
    description: 'Heure de fin (format HH:mm)',
    example: '14:00',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 14:00)',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Disponible (true) ou bloqué (false)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({
    description: 'Raison',
    example: 'Formation professionnelle',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
