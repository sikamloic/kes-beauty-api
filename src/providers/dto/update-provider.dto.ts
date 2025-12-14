import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';

/**
 * DTO Update Provider Profile
 * Permet de compléter les infos après inscription
 */
export class UpdateProviderDto {
  @ApiProperty({
    description: 'Email (optionnel)',
    example: 'provider@example.com',
    required: false,
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Nom du salon/entreprise',
    example: 'Salon Beauté Royale',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 255)
  businessName?: string;

  @ApiProperty({
    description: 'Biographie/présentation',
    example: 'Coiffeuse professionnelle spécialisée en cheveux afro depuis 10 ans',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(20, 1000)
  bio?: string;

  @ApiProperty({
    description: 'Années d\'expérience',
    example: 5,
    minimum: 0,
    maximum: 50,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  yearsExperience?: number;

  @ApiProperty({
    description: 'Adresse complète',
    example: 'Quartier Akwa, Rue de la Joie',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(10, 500)
  address?: string;

  @ApiProperty({
    description: 'Quartier',
    example: 'Akwa',
    required: false,
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({
    description: 'Type de business (ID)',
    example: 1,
    minimum: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  businessTypeId?: number;
}
