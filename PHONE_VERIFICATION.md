# 📱 Vérification Téléphone par SMS

## ✅ Architecture OTP Universelle

### Table `otps` - Usage Générique

```sql
CREATE TABLE otps (
    id INT PRIMARY KEY,
    identifier VARCHAR(255),  -- phone, email, userId
    code VARCHAR(10),         -- Code OTP
    type VARCHAR(50),         -- Type de vérification
    expires_at DATETIME,
    attempts INT DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    used_at DATETIME NULL,
    created_at DATETIME,
    UNIQUE(identifier, type)
);
```

**Types supportés:**
- `phone_verification` - Vérification téléphone
- `email_verification` - Vérification email
- `password_reset` - Réinitialisation mot de passe
- `mfa` - Authentification multi-facteurs
- `login_confirmation` - Confirmation connexion sensible

---

## 🔄 Flow Vérification SMS

### 1. Envoyer Code

```
POST /api/v1/auth/send-verification-code
{
  "phone": "683264591"
}
```

**Réponse (Mode Mock):**
```json
{
  "success": true,
  "message": "Code envoyé (mode développement)",
  "mockCode": "123456"
}
```

**Réponse (Mode Production):**
```json
{
  "success": true,
  "message": "Code de vérification envoyé par SMS"
}
```

### 2. Vérifier Code

```
POST /api/v1/auth/verify-phone
{
  "phone": "683264591",
  "code": "123456"
}
```

**Réponse Succès:**
```json
{
  "success": true,
  "message": "Téléphone vérifié avec succès"
}
```

**Erreurs Possibles:**
- `400` - Code incorrect (3 tentatives max)
- `400` - Code expiré (5 minutes)
- `400` - Code déjà utilisé
- `400` - Utilisateur non trouvé

---

## 🛡️ Sécurité

### Limitations

**Tentatives:**
- Max 3 tentatives par code
- Après 3 échecs → Demander nouveau code

**Expiration:**
- Code valide 5 minutes
- Après expiration → Demander nouveau code

**Réutilisation:**
- Code marqué `is_used` après validation
- Impossible de réutiliser un code

### Mode Mock (Développement)

**Activation:**
```env
SMS_MOCK_MODE=true
```

**Comportement:**
- Code retourné dans la réponse API
- Pas d'envoi SMS réel
- Log dans console serveur
- Parfait pour tests automatisés

**Production:**
```env
SMS_MOCK_MODE=false
```
- Code envoyé par SMS réel
- Pas de code dans réponse API
- Intégration provider SMS requis

---

## 📊 Cas d'Usage

### 1. Vérification après Inscription

```typescript
// 1. Provider s'inscrit
POST /providers/register
{ fullName, phone, password, city }

// 2. Envoyer code SMS
POST /auth/send-verification-code
{ phone: "683264591" }

// 3. Provider entre le code reçu
POST /auth/verify-phone
{ phone: "683264591", code: "123456" }

// ✅ phoneVerifiedAt mis à jour
```

### 2. Vérification Email

```typescript
// Même table OTP, type différent
await prisma.otp.create({
  identifier: "user@example.com",
  type: "email_verification",
  code: "123456",
  expiresAt: new Date(Date.now() + 5 * 60 * 1000)
});
```

### 3. Reset Password

```typescript
// Même table OTP, type différent
await prisma.otp.create({
  identifier: "683264591",
  type: "password_reset",
  code: "789012",
  expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 min
});
```

### 4. MFA (Multi-Factor Auth)

```typescript
// Même table OTP, type différent
await prisma.otp.create({
  identifier: userId.toString(),
  type: "mfa",
  code: "456789",
  expiresAt: new Date(Date.now() + 2 * 60 * 1000) // 2 min
});
```

---

## 🔧 Intégration Provider SMS

### TODO: Remplacer Mock par Vrai SMS

```typescript
// src/auth/services/phone-verification.service.ts

if (this.MOCK_MODE) {
  // Mode développement
  return { success: true, mockCode: code };
} else {
  // Mode production - À implémenter
  await this.smsProvider.send(normalizedPhone, `Code: ${code}`);
  return { success: true, message: "SMS envoyé" };
}
```

**Providers SMS Cameroun:**
- **SMS Gateway Cameroun** - Agrégateur local
- **Twilio** - International
- **Vonage (Nexmo)** - International
- **Africa's Talking** - Afrique

---

## 🧪 Tests

### Test Mode Mock

```bash
# 1. Activer mode mock
SMS_MOCK_MODE=true

# 2. Envoyer code
POST /auth/send-verification-code
{ "phone": "683264591" }

# Réponse contient mockCode
{
  "success": true,
  "mockCode": "123456"
}

# 3. Vérifier avec le code
POST /auth/verify-phone
{ "phone": "683264591", "code": "123456" }

# ✅ Succès
```

### Test Tentatives

```bash
# Tentative 1 (mauvais code)
POST /auth/verify-phone
{ "phone": "683264591", "code": "000000" }
# ❌ "Code incorrect. 2 tentative(s) restante(s)."

# Tentative 2 (mauvais code)
POST /auth/verify-phone
{ "phone": "683264591", "code": "111111" }
# ❌ "Code incorrect. 1 tentative(s) restante(s)."

# Tentative 3 (mauvais code)
POST /auth/verify-phone
{ "phone": "683264591", "code": "222222" }
# ❌ "Code incorrect. 0 tentative(s) restante(s)."

# Tentative 4
POST /auth/verify-phone
{ "phone": "683264591", "code": "123456" }
# ❌ "Trop de tentatives. Demandez un nouveau code."
```

### Test Expiration

```bash
# Attendre 5+ minutes après envoi
POST /auth/verify-phone
{ "phone": "683264591", "code": "123456" }
# ❌ "Code expiré. Demandez un nouveau code."
```

---

## 🎯 Avantages Architecture

**1. Table Unique:**
- ✅ Pas de duplication (verification_codes, password_reset_codes, etc.)
- ✅ Même logique pour tous types OTP
- ✅ Maintenance simplifiée

**2. Flexible:**
- ✅ Ajouter nouveau type = changer 1 string
- ✅ Pas de migration DB
- ✅ Extensible facilement

**3. Sécurisé:**
- ✅ Limitation tentatives
- ✅ Expiration automatique
- ✅ Marquage utilisé
- ✅ Nettoyage automatique

**4. Testable:**
- ✅ Mode mock pour dev
- ✅ Pas besoin SMS réel en test
- ✅ CI/CD friendly

---

## ✅ Status

- [x] Table `otps` créée
- [x] Service `PhoneVerificationService`
- [x] Endpoints `/send-verification-code` et `/verify-phone`
- [x] Mode mock fonctionnel
- [x] Validation 3 tentatives max
- [x] Expiration 5 minutes
- [x] Nettoyage codes expirés
- [ ] Intégration provider SMS réel
- [ ] Vérification email (même table)
- [ ] Reset password (même table)
- [ ] MFA (même table)
