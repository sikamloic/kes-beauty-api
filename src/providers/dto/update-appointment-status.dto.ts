import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description: 'Nouveau statut du rendez-vous',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Raison de l\'annulation (obligatoire si status = cancelled)',
    example: 'Client indisponible',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
