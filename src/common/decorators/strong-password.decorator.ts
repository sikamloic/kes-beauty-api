import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Contraintes de mot de passe fort
 * - Minimum 8 caractères
 * - Au moins 1 majuscule
 * - Au moins 1 minuscule
 * - Au moins 1 chiffre
 * - Au moins 1 caractère spécial (@$!%*?&)
 */
@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // Minimum 8 caractères
    if (password.length < 8) {
      return false;
    }

    // Maximum 100 caractères
    if (password.length > 100) {
      return false;
    }

    // Au moins 1 majuscule
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Au moins 1 minuscule
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Au moins 1 chiffre
    if (!/[0-9]/.test(password)) {
      return false;
    }

    // Au moins 1 caractère spécial
    if (!/[@$!%*?&]/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'Le mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre et 1 caractère spécial (@$!%*?&)';
  }
}

/**
 * Décorateur @IsStrongPassword()
 * 
 * Usage:
 * @IsStrongPassword()
 * password: string;
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
