import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { AddSpecialtyDto } from './add-specialty.dto';

/**
 * DTO Ajouter Plusieurs Spécialités en Bulk
 */
export class AddSpecialtiesBulkDto {
  @ApiProperty({
    description: 'Liste des spécialités à ajouter (max 10)',
    type: [AddSpecialtyDto],
    example: [
      { categoryId: 6, yearsExperience: 8, isPrimary: true },
      { categoryId: 7, yearsExperience: 5 },
      { categoryId: 8, yearsExperience: 3 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une spécialité est requise' })
  @ArrayMaxSize(10, { message: 'Maximum 10 spécialités à la fois' })
  @ValidateNested({ each: true })
  @Type(() => AddSpecialtyDto)
  specialties!: AddSpecialtyDto[];
}
