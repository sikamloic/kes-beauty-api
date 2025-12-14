import { PhoneUtil } from './phone.util';

describe('PhoneUtil', () => {
  describe('isValid', () => {
    it('devrait valider format international +2376XXXXXXX', () => {
      expect(PhoneUtil.isValid('+237655443322')).toBe(true);
      expect(PhoneUtil.isValid('+237755443322')).toBe(true);
      expect(PhoneUtil.isValid('+237255443322')).toBe(true);
    });

    it('devrait valider format sans + (2376XXXXXXX)', () => {
      expect(PhoneUtil.isValid('237655443322')).toBe(true);
      expect(PhoneUtil.isValid('237755443322')).toBe(true);
    });

    it('devrait valider format avec préfixe 00 (002376XXXXXXX)', () => {
      expect(PhoneUtil.isValid('00237655443322')).toBe(true);
      expect(PhoneUtil.isValid('00237755443322')).toBe(true);
    });

    it('devrait valider format local (6XXXXXXX)', () => {
      expect(PhoneUtil.isValid('655443322')).toBe(true);
      expect(PhoneUtil.isValid('755443322')).toBe(true);
      expect(PhoneUtil.isValid('255443322')).toBe(true);
    });

    it('devrait rejeter opérateurs invalides', () => {
      expect(PhoneUtil.isValid('+237155443322')).toBe(false); // 1 invalide
      expect(PhoneUtil.isValid('+237055443322')).toBe(false); // 0 invalide
      expect(PhoneUtil.isValid('+237355443322')).toBe(false); // 3 invalide
    });

    it('devrait rejeter formats invalides', () => {
      expect(PhoneUtil.isValid('123456789')).toBe(false);
      expect(PhoneUtil.isValid('+33612345678')).toBe(false); // France
      expect(PhoneUtil.isValid('06123456789')).toBe(false);
      expect(PhoneUtil.isValid('')).toBe(false);
      expect(PhoneUtil.isValid(null as any)).toBe(false);
    });

    it('devrait rejeter numéros trop courts ou trop longs', () => {
      expect(PhoneUtil.isValid('+23765544332')).toBe(false); // 10 chiffres
      expect(PhoneUtil.isValid('+2376554433')).toBe(false); // 9 chiffres
      expect(PhoneUtil.isValid('6554433')).toBe(false); // 7 chiffres local (trop court)
    });
  });

  describe('normalize', () => {
    it('devrait normaliser format international', () => {
      expect(PhoneUtil.normalize('+237655443322')).toBe('65544332');
      expect(PhoneUtil.normalize('+237755443322')).toBe('75544332');
    });

    it('devrait normaliser format sans +', () => {
      expect(PhoneUtil.normalize('237655443322')).toBe('65544332');
    });

    it('devrait normaliser format avec préfixe 00', () => {
      expect(PhoneUtil.normalize('00237655443322')).toBe('65544332');
    });

    it('devrait normaliser format local', () => {
      expect(PhoneUtil.normalize('65544332')).toBe('65544332');
      expect(PhoneUtil.normalize('75544332')).toBe('75544332');
    });

    it('devrait retourner null pour formats invalides', () => {
      expect(PhoneUtil.normalize('123456789')).toBeNull();
      expect(PhoneUtil.normalize('+33612345678')).toBeNull();
      expect(PhoneUtil.normalize('')).toBeNull();
    });

    it('devrait gérer les espaces', () => {
      expect(PhoneUtil.normalize('  237655443322  ')).toBe('65544332');
      expect(PhoneUtil.normalize('  +237655443322  ')).toBe('65544332');
    });
  });

  describe('format', () => {
    it('devrait formater pour affichage', () => {
      expect(PhoneUtil.format('65544332')).toBe('+237 655 44 33 2');
      expect(PhoneUtil.format('75544332')).toBe('+237 755 44 33 2');
    });

    it('devrait retourner input si format invalide', () => {
      expect(PhoneUtil.format('123')).toBe('123');
      expect(PhoneUtil.format('')).toBe('');
    });
  });

  describe('toInternational', () => {
    it('devrait convertir en format international', () => {
      expect(PhoneUtil.toInternational('65544332')).toBe('+23765544332');
    });
  });

  describe('getOperator', () => {
    it('devrait identifier MTN', () => {
      expect(PhoneUtil.getOperator('65544332')).toBe('MTN');
      expect(PhoneUtil.getOperator('25544332')).toBe('MTN');
      expect(PhoneUtil.getOperator('85544332')).toBe('MTN');
    });

    it('devrait identifier Orange', () => {
      expect(PhoneUtil.getOperator('75544332')).toBe('Orange');
      expect(PhoneUtil.getOperator('95544332')).toBe('Orange');
    });

    it('devrait identifier Nexttel', () => {
      expect(PhoneUtil.getOperator('45544332')).toBe('Nexttel');
    });

    it('devrait identifier Camtel', () => {
      expect(PhoneUtil.getOperator('55544332')).toBe('Camtel');
    });

    it('devrait retourner null pour format invalide', () => {
      expect(PhoneUtil.getOperator('123')).toBeNull();
      expect(PhoneUtil.getOperator('')).toBeNull();
    });
  });

  describe('validateAndNormalize', () => {
    it('devrait valider et normaliser numéro valide', () => {
      const result = PhoneUtil.validateAndNormalize('+237655443322');
      
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('65544332');
      expect(result.formatted).toBe('+237 655 44 33 2');
      expect(result.operator).toBe('MTN');
      expect(result.error).toBeUndefined();
    });

    it('devrait retourner erreur pour numéro invalide', () => {
      const result = PhoneUtil.validateAndNormalize('123456789');
      
      expect(result.isValid).toBe(false);
      expect(result.normalized).toBeNull();
      expect(result.formatted).toBeNull();
      expect(result.operator).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('devrait retourner erreur pour input vide', () => {
      const result = PhoneUtil.validateAndNormalize('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Numéro de téléphone requis');
    });
  });

  describe('areEqual', () => {
    it('devrait comparer deux numéros identiques (formats différents)', () => {
      expect(PhoneUtil.areEqual('+237655443322', '237655443322')).toBe(true);
      expect(PhoneUtil.areEqual('00237655443322', '65544332')).toBe(true);
      expect(PhoneUtil.areEqual('+237655443322', '65544332')).toBe(true);
    });

    it('devrait retourner false pour numéros différents', () => {
      expect(PhoneUtil.areEqual('+237655443322', '+237755443322')).toBe(false);
    });

    it('devrait retourner false pour formats invalides', () => {
      expect(PhoneUtil.areEqual('123', '456')).toBe(false);
    });
  });

  describe('getExamples', () => {
    it('devrait retourner exemples valides', () => {
      const examples = PhoneUtil.getExamples();
      
      expect(examples.length).toBeGreaterThan(0);
      examples.forEach(example => {
        expect(PhoneUtil.isValid(example)).toBe(true);
      });
    });
  });
});
