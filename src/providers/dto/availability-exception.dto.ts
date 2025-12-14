import {
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour créer une exception de disponibilité
 */
export class CreateAvailabilityExceptionDto {
  @ApiProperty({
    description: 'Date de l\'exception (format YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Type d\'exception',
    enum: ['unavailable', 'custom_hours'],
    example: 'unavailable',
  })
  @IsString()
  @IsIn(['unavailable', 'custom_hours'])
  type!: 'unavailable' | 'custom_hours';

  @ApiProperty({
    description: 'Heure de début (requis si type=custom_hours)',
    example: '10:00',
    required: false,
  })
  @ValidateIf((o) => o.type === 'custom_hours')
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 10:00)',
  })
  startTime?: string;

  @ApiProperty({
    description: 'Heure de fin (requis si type=custom_hours)',
    example: '14:00',
    required: false,
  })
  @ValidateIf((o) => o.type === 'custom_hours')
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 14:00)',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Raison de l\'exception (optionnel)',
    example: 'Jour férié - Noël',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO pour mettre à jour une exception de disponibilité
 */
export class UpdateAvailabilityExceptionDto {
  @ApiProperty({
    description: 'Type d\'exception',
    enum: ['unavailable', 'custom_hours'],
    example: 'custom_hours',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['unavailable', 'custom_hours'])
  type?: 'unavailable' | 'custom_hours';

  @ApiProperty({
    description: 'Heure de début',
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
    description: 'Heure de fin',
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
    description: 'Raison de l\'exception',
    example: 'Formation professionnelle',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
