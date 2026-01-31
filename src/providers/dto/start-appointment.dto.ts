import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO pour démarrer une prestation avec le code de confirmation
 */
export class StartAppointmentDto {
  @ApiProperty({
    description: 'Code de confirmation à 4 chiffres donné par le client',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Length(4, 4, { message: 'Le code doit contenir exactement 4 chiffres' })
  code!: string;
}
