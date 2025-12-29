import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { PhoneUtil, IsStrongPassword } from '../../common';

/**
 * Validateur personnalisé pour numéros de téléphone camerounais
 */
@ValidatorConstraint({ name: 'isCameroonPhone', async: false })
class IsCameroonPhoneConstraint implements ValidatorConstraintInterface {
  validate(phone: string): boolean {
    return PhoneUtil.isValid(phone);
  }

  defaultMessage(): string {
    return 'Format de téléphone invalide. Formats acceptés: +2376XXXXXXXX, 2376XXXXXXXX, 002376XXXXXXXX ou 6XXXXXXXX (9 chiffres)';
  }
}

/**
 * DTO Inscription Client
 * 
 * Inscription rapide avec infos minimales:
 * - Prénom (requis)
 * - Nom (optionnel)
 * - Téléphone (requis)
 * - Mot de passe (requis)
 * - Email (optionnel)
 */
export class RegisterClientDto {
  @ApiProperty({
    description: 'Prénom du client',
    example: 'Jean',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @Length(2, 100, { message: 'Le prénom doit contenir entre 2 et 100 caractères' })
  firstName!: string;

  @ApiProperty({
    description: 'Nom de famille (optionnel)',
    example: 'Kamga',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 100, { message: 'Le nom doit contenir entre 2 et 100 caractères' })
  lastName?: string;

  @ApiProperty({
    description: 'Numéro de téléphone (formats acceptés: +2376XXXXXXXX, 2376XXXXXXXX, 002376XXXXXXXX, 6XXXXXXXX)',
    example: '+237655443322',
    examples: ['+237655443322', '237655443322', '00237655443322', '655443322'],
  })
  @IsString()
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Validate(IsCameroonPhoneConstraint)
  phone!: string;

  @ApiProperty({
    description: 'Mot de passe sécurisé (8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial)',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({
    description: 'Email (optionnel)',
    example: 'jean.kamga@email.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format email invalide' })
  email?: string;
}
