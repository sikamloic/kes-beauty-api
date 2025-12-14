# 🔍 Debug Login

## Étapes de Debug

### 1. Redémarrer le Serveur
```bash
npm run start:dev
```

### 2. Tenter le Login
```bash
POST http://localhost:4000/api/v1/auth/login
{
  "login": "683264591",
  "password": "sikam@210301"
}
```

### 3. Vérifier les Logs Serveur

Tu devrais voir dans la console:

```
🔍 Login attempt: {
  original: '683264591',
  normalized: '237683264591',
  isEmail: false
}
👤 User trouvé: ID: 1, Phone: 237683264591
🔐 Password check: {
  provided: 'sik***',
  valid: true/false
}
```

---

## Scénarios Possibles

### ❌ Scénario 1: Normalisation Échoue
```
❌ Normalisation échouée: 683264591 [Error...]
```
**Cause:** Format téléphone invalide
**Solution:** Vérifier PhoneValidationService

### ❌ Scénario 2: User Non Trouvé
```
🔍 Login attempt: { normalized: '237683264591' }
👤 User trouvé: NON TROUVÉ
```
**Cause:** Téléphone pas en BD ou format différent
**Solution:** Vérifier en BD:
```sql
SELECT phone FROM users;
```

### ❌ Scénario 3: Mot de Passe Invalide
```
👤 User trouvé: ID: 1, Phone: 237683264591
🔐 Password check: { valid: false }
```
**Cause:** Mot de passe incorrect
**Solution:** 
- Vérifier le mot de passe utilisé lors de l'inscription
- Ou réinitialiser le mot de passe

### ✅ Scénario 4: Succès
```
🔍 Login attempt: { normalized: '237683264591' }
👤 User trouvé: ID: 1, Phone: 237683264591
🔐 Password check: { valid: true }
```
**Résultat:** Login réussi, tokens retournés

---

## Vérifications BD

### Voir le téléphone stocké
```sql
SELECT id, phone, is_active FROM users;
```

### Voir si provider existe
```sql
SELECT 
  u.id,
  u.phone,
  u.is_active,
  pp.id as provider_id,
  pp.full_name
FROM users u
LEFT JOIN provider_profiles pp ON u.id = pp.user_id;
```

---

## Solutions Rapides

### Si téléphone au mauvais format en BD
```sql
-- Mettre à jour le format
UPDATE users SET phone = '237683264591' WHERE phone = '683264591';
```

### Si mot de passe oublié
Réinscrire le provider:
```bash
POST /api/v1/providers/register
{
  "fullName": "Test Provider",
  "phone": "683264591",
  "password": "sikam@210301",
  "city": "Douala"
}
```

---

## Après Debug

Une fois le problème identifié, on pourra retirer les logs de debug.
