import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO Mettre à jour Spécialité
 */
export class UpdateSpecialtyDto {
  @ApiProperty({
    description: 'Années d\'expérience dans cette spécialité',
    example: 10,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({
    description: 'Spécialité principale',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
