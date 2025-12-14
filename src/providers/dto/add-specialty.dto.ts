import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsBoolean, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO Ajouter Spécialité
 */
export class AddSpecialtyDto {
  @ApiProperty({
    description: 'ID de la catégorie de service',
    example: 6,
  })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({
    description: 'Années d\'expérience dans cette spécialité',
    example: 8,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({
    description: 'Spécialité principale (une seule autorisée)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
