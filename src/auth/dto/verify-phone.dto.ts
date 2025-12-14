import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

/**
 * DTO Vérification Code SMS
 */
export class VerifyPhoneDto {
  @ApiProperty({
    description: 'Numéro de téléphone à vérifier',
    example: '683264591',
  })
  @IsString()
  @Matches(/^[0-9]{9}$/, {
    message: 'Format téléphone invalide (9 chiffres attendus)',
  })
  phone!: string;

  @ApiProperty({
    description: 'Code de vérification à 6 chiffres',
    example: '123456',
  })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  @Matches(/^[0-9]{6}$/, { message: 'Le code doit être numérique' })
  code!: string;
}
