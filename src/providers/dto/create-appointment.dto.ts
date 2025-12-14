import {
  IsInt,
  IsDateString,
  IsOptional,
  Min,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'ID du service réservé',
    example: 1,
  })
  @IsInt()
  @Min(1)
  serviceId!: number;

  @ApiProperty({
    description: 'Date et heure du rendez-vous (ISO 8601)',
    example: '2025-12-10T14:00:00Z',
  })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional({
    description: 'Notes ou demandes spéciales du client',
    example: 'Je préfère une coupe courte',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
