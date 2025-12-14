/**
 * Utilitaire de validation et normalisation des numéros de téléphone camerounais
 * Principe SOLID: SRP - Responsabilité unique = gestion numéros téléphone
 * 
 * Formats acceptés:
 * - +2376XXXXXXXX (international - 12 chiffres)
 * - 2376XXXXXXXX (sans + - 12 chiffres)
 * - 002376XXXXXXXX (avec préfixe 00 - 14 chiffres)
 * - 6XXXXXXXX (local - 9 chiffres)
 * 
 * Premier chiffre: {2,4,5,6,7,8,9}
 * Suivi de 8 chiffres
 * 
 * Format stockage: 2376XXXXXXXX (12 chiffres, avec 237 mais sans +)
 */

export class PhoneUtil {
  // Préfixe pays Cameroun
  private static readonly COUNTRY_CODE = '237';
  
  // Opérateurs valides (premier chiffre après 237)
  private static readonly VALID_OPERATORS = ['2', '4', '5', '6', '7', '8', '9'];
  
  // Regex patterns
  private static readonly PATTERNS = {
    // +2376XXXXXXXX (12 chiffres)
    international: /^\+237([2-9])(\d{8})$/,
    
    // 2376XXXXXXXX (12 chiffres)
    withoutPlus: /^237([2-9])(\d{8})$/,
    
    // 002376XXXXXXXX (14 chiffres)
    withPrefix: /^00237([2-9])(\d{8})$/,
    
    // 6XXXXXXXX (9 chiffres local)
    local: /^([2-9])(\d{8})$/,
  };

  /**
   * Valider un numéro de téléphone camerounais
   * @param phone Numéro à valider (n'importe quel format)
   * @returns true si valide, false sinon
   */
  static isValid(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }

    const cleaned = phone.trim();

    // Tester tous les formats
    return (
      this.PATTERNS.international.test(cleaned) ||
      this.PATTERNS.withoutPlus.test(cleaned) ||
      this.PATTERNS.withPrefix.test(cleaned) ||
      this.PATTERNS.local.test(cleaned)
    );
  }

  /**
   * Normaliser un numéro au format de stockage: 2376XXXXXXXX (12 chiffres, avec 237)
   * @param phone Numéro à normaliser (n'importe quel format)
   * @returns Numéro normalisé ou null si invalide
   */
  static normalize(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }

    const cleaned = phone.trim();

    // Format: +2376XXXXXXXX
    let match = cleaned.match(this.PATTERNS.international);
    if (match) {
      return `${this.COUNTRY_CODE}${match[1]}${match[2]}`; // Retourne 2376XXXXXXXX (12 chiffres)
    }

    // Format: 2376XXXXXXXX (déjà bon format)
    match = cleaned.match(this.PATTERNS.withoutPlus);
    if (match) {
      return `${this.COUNTRY_CODE}${match[1]}${match[2]}`; // Retourne 2376XXXXXXXX (12 chiffres)
    }

    // Format: 002376XXXXXXXX
    match = cleaned.match(this.PATTERNS.withPrefix);
    if (match) {
      return `${this.COUNTRY_CODE}${match[1]}${match[2]}`; // Retourne 2376XXXXXXXX (12 chiffres)
    }

    // Format: 6XXXXXXXX (local)
    match = cleaned.match(this.PATTERNS.local);
    if (match) {
      return `${this.COUNTRY_CODE}${match[1]}${match[2]}`; // Retourne 2376XXXXXXXX (12 chiffres)
    }

    return null;
  }

  /**
   * Formater un numéro pour affichage: +237 6XX XX XX XX
   * @param phone Numéro normalisé (2376XXXXXXXX - 12 chiffres)
   * @returns Numéro formaté pour affichage
   */
  static format(phone: string): string {
    if (!phone || phone.length !== 12) {
      return phone;
    }

    // 2376XXXXXXXX -> +237 6XX XX XX XX
    const operator = phone.substring(3, 4);
    const part1 = phone.substring(4, 6);
    const part2 = phone.substring(6, 8);
    const part3 = phone.substring(8, 10);
    const part4 = phone.substring(10, 12);

    return `+${this.COUNTRY_CODE} ${operator}${part1} ${part2} ${part3} ${part4}`;
  }

  /**
   * Formater pour affichage international: +2376XXXXXXXX
   * @param phone Numéro normalisé (2376XXXXXXXX - 12 chiffres)
   * @returns Format international
   */
  static toInternational(phone: string): string {
    if (!phone || phone.length !== 12) {
      return phone;
    }

    return `+${phone}`;
  }

  /**
   * Extraire l'opérateur d'un numéro
   * @param phone Numéro normalisé (2376XXXXXXXX - 12 chiffres)
   * @returns Code opérateur ou null
   */
  static getOperator(phone: string): string | null {
    if (!phone || phone.length !== 12) {
      return null;
    }

    const operator = phone.substring(3, 4);
    
    if (!this.VALID_OPERATORS.includes(operator)) {
      return null;
    }

    // Mapping opérateurs Cameroun
    const operatorMap: Record<string, string> = {
      '2': 'MTN',      // 237 2XX XX XX XX
      '4': 'Nexttel',  // 237 4XX XX XX XX
      '5': 'Camtel',   // 237 5XX XX XX XX
      '6': 'MTN',      // 237 6XX XX XX XX (principal)
      '7': 'Orange',   // 237 7XX XX XX XX
      '8': 'MTN',      // 237 8XX XX XX XX
      '9': 'Orange',   // 237 9XX XX XX XX
    };

    return operatorMap[operator] || 'Unknown';
  }

  /**
   * Valider et normaliser en une seule opération
   * @param phone Numéro à valider et normaliser
   * @returns Objet avec validation et numéro normalisé
   */
  static validateAndNormalize(phone: string): {
    isValid: boolean;
    normalized: string | null;
    formatted: string | null;
    operator: string | null;
    error?: string;
  } {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        normalized: null,
        formatted: null,
        operator: null,
        error: 'Numéro de téléphone requis',
      };
    }

    const normalized = this.normalize(phone);

    if (!normalized) {
      return {
        isValid: false,
        normalized: null,
        formatted: null,
        operator: null,
        error: 'Format de numéro invalide. Utilisez: +2376XXXXXXXX, 2376XXXXXXXX, 002376XXXXXXXX ou 6XXXXXXXX',
      };
    }

    return {
      isValid: true,
      normalized,
      formatted: this.format(normalized),
      operator: this.getOperator(normalized),
    };
  }

  /**
   * Générer exemples de numéros valides (pour tests/docs)
   */
  static getExamples(): string[] {
    return [
      '+237655443322',  // Format international
      '237655443322',   // Sans +
      '00237655443322', // Avec préfixe 00
      '655443322',      // Format local
    ];
  }

  /**
   * Vérifier si deux numéros sont identiques (après normalisation)
   */
  static areEqual(phone1: string, phone2: string): boolean {
    const normalized1 = this.normalize(phone1);
    const normalized2 = this.normalize(phone2);

    if (!normalized1 || !normalized2) {
      return false;
    }

    return normalized1 === normalized2;
  }
}
