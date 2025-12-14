import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Length,
} from 'class-validator';

/**
 * DTO Création Service
 */
export class CreateServiceDto {
  @ApiProperty({
    description: 'ID de la catégorie',
    example: 1,
  })
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ApiProperty({
    description: 'Nom du service',
    example: 'Coiffure Afro - Tresses',
  })
  @IsString()
  @Length(3, 255)
  name!: string;

  @ApiProperty({
    description: 'Description du service',
    example: 'Tresses africaines traditionnelles, durée 3-4 heures',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(10, 1000)
  description?: string;

  @ApiProperty({
    description: 'Prix en FCFA',
    example: 15000,
  })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  price!: number;

  @ApiProperty({
    description: 'Durée en minutes',
    example: 180,
  })
  @IsInt()
  @Min(15)
  @Max(480)
  duration!: number;
}
