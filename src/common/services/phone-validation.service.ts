import { Injectable } from '@nestjs/common';
import { PhoneUtil } from '../utils/phone.util';
import { ValidationException } from '../exceptions';

/**
 * Service de validation téléphone
 * 
 * Principe SOLID:
 * - SRP: Validation téléphone uniquement
 * - Utilisé par: Providers, Clients, Auth, etc.
 * - Délègue à PhoneUtil pour la logique pure
 */
@Injectable()
export class PhoneValidationService {
  /**
   * Valider et normaliser un téléphone
   * @throws ValidationException si format invalide
   */
  validateAndNormalize(phone: string): string {
    const normalized = PhoneUtil.normalize(phone);

    if (!normalized) {
      throw new ValidationException('Format de téléphone invalide', {
        phone: [
          'Formats acceptés: +2376XXXXXXXX, 2376XXXXXXXX, 002376XXXXXXXX ou 6XXXXXXXX',
        ],
      });
    }

    return normalized;
  }

  /**
   * Formater pour affichage
   */
  format(phone: string): string {
    return PhoneUtil.format(phone);
  }

  /**
   * Obtenir l'opérateur
   */
  getOperator(phone: string): string | null {
    return PhoneUtil.getOperator(phone);
  }

  /**
   * Vérifier si deux numéros sont identiques
   */
  areEqual(phone1: string, phone2: string): boolean {
    return PhoneUtil.areEqual(phone1, phone2);
  }
}
