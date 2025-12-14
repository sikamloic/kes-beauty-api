import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Length,
} from 'class-validator';

/**
 * DTO Mise à jour Service
 */
export class UpdateServiceDto {
  @ApiProperty({
    description: 'ID de la catégorie',
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiProperty({
    description: 'Nom du service',
    example: 'Coiffure Afro - Tresses',
    required: false,
  })
  @IsString()
  @Length(3, 255)
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Description du service',
    example: 'Tresses africaines traditionnelles',
    required: false,
  })
  @IsString()
  @Length(10, 1000)
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Prix en FCFA',
    example: 15000,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(1000000)
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Durée en minutes',
    example: 180,
    required: false,
  })
  @IsInt()
  @Min(15)
  @Max(480)
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Service actif',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
