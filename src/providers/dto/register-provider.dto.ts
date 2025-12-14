import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PhoneUtil } from '../../common';

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
 * DTO Inscription Provider - VERSION SIMPLIFIÉE
 * P0.1 - Infos minimales uniquement
 * 
 * Principe: Inscription rapide <2 minutes
 * Le reste des infos sera complété via update après validation
 */
export class RegisterProviderDto {
  @ApiProperty({
    description: 'Nom complet du prestataire',
    example: 'Marie Dupont',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  @Length(2, 100, { message: 'Le nom doit contenir entre 2 et 100 caractères' })
  fullName!: string;

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
    description: 'Mot de passe (minimum 6 caractères)',
    example: 'Password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @Length(6, 100, { message: 'Le mot de passe doit contenir au moins 6 caractères' })
  password!: string;

  @ApiProperty({
    description: 'Ville d\'activité',
    example: 'Douala',
    enum: ['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Autre'],
  })
  @IsString()
  @IsNotEmpty({ message: 'La ville est requise' })
  city!: string;
}
