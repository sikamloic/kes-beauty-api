import {
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour un créneau horaire
 */
export class TimeSlotDto {
  @ApiProperty({
    description: 'Heure de début (format HH:mm)',
    example: '09:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 09:00)',
  })
  startTime!: string;

  @ApiProperty({
    description: 'Heure de fin (format HH:mm)',
    example: '17:00',
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Format invalide. Utilisez HH:mm (ex: 17:00)',
  })
  endTime!: string;
}

/**
 * DTO pour définir les disponibilités d'un jour
 */
export class DayAvailabilityDto {
  @ApiProperty({
    description: 'Jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Créneaux horaires pour ce jour',
    type: [TimeSlotDto],
    example: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un créneau horaire requis' })
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  slots!: TimeSlotDto[];

  @ApiProperty({
    description: 'Activer/désactiver ce jour',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO pour définir les disponibilités hebdomadaires
 */
export class SetWeeklyAvailabilityDto {
  @ApiProperty({
    description: 'Disponibilités par jour de la semaine',
    type: [DayAvailabilityDto],
    example: [
      {
        dayOfWeek: 1,
        slots: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '18:00' },
        ],
        isActive: true,
      },
      {
        dayOfWeek: 2,
        slots: [{ startTime: '10:00', endTime: '17:00' }],
        isActive: true,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayAvailabilityDto)
  days!: DayAvailabilityDto[];
}
