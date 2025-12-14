# 🔐 Hashing des Refresh Tokens

## ✅ Implémentation Sécurisée

### Principe

Les refresh tokens sont **hashés avec SHA-256** avant d'être stockés en base de données.

```
Token Original (JWT) → SHA-256 → Hash (64 chars) → Stocké en BD
```

---

## 🔒 Sécurité Renforcée

### Avant (Risque)
```sql
-- Si BD compromise, tokens utilisables directement
SELECT token FROM refresh_tokens;
-- eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjF9.abc123...
```
❌ **Attaquant peut utiliser le token immédiatement**

### Après (Sécurisé)
```sql
-- Si BD compromise, tokens inutilisables
SELECT token FROM refresh_tokens;
-- 8f3e5b2c1a9d7f4e6b8c2a1d9f7e5c3b1a9d8f7e6c5b4a3d2e1f9c8b7a6d5e4c3
```
✅ **Hash inutilisable sans le token original**

---

## 🔄 Flow Complet

### 1. Login - Création Token
```typescript
// Générer JWT
const tokens = jwtToken.generateTokenPair({ userId, role });
// tokens.refreshToken = "eyJhbGc..."

// Hasher avant stockage
const hashedToken = crypto
  .createHash('sha256')
  .update(tokens.refreshToken)
  .digest('hex');
// hashedToken = "8f3e5b2c..."

// Stocker hash en BD
await refreshTokenService.create({
  token: hashedToken,  // ← Hash stocké
  userId,
  expiresAt,
});

// Envoyer token original au client (cookie)
response.cookie('refreshToken', tokens.refreshToken);
```

### 2. Refresh - Vérification Token
```typescript
// Client envoie token original (cookie)
const token = request.cookies['refreshToken'];
// token = "eyJhbGc..."

// Hasher pour comparaison
const hashedToken = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');
// hashedToken = "8f3e5b2c..."

// Chercher en BD par hash
const found = await prisma.refreshToken.findUnique({
  where: { token: hashedToken },
});

if (found && !found.isRevoked && !isExpired) {
  // ✅ Token valide
}
```

### 3. Logout - Révocation Token
```typescript
// Client envoie token original
const token = request.cookies['refreshToken'];

// Hasher pour recherche
const hashedToken = crypto
  .createHash('sha256')
  .update(token)
  .digest('hex');

// Révoquer par hash
await prisma.refreshToken.update({
  where: { token: hashedToken },
  data: { isRevoked: true },
});
```

---

## 📊 Comparaison

| Aspect | Sans Hash | Avec Hash (SHA-256) |
|--------|-----------|---------------------|
| **Stockage BD** | Token JWT complet (500 chars) | Hash (64 chars) |
| **Si BD compromise** | ❌ Tokens utilisables | ✅ Hash inutilisable |
| **Performance** | Rapide | Très rapide (hash léger) |
| **Révocation** | ✅ Possible | ✅ Possible |
| **Sécurité** | Moyenne | ✅ Élevée |

---

## 🛡️ Avantages Sécurité

### 1. Protection contre Dump BD
Si un attaquant accède à la BD:
- **Sans hash:** Peut voler tous les tokens et les utiliser
- **Avec hash:** Ne peut rien faire avec les hashs

### 2. Conformité RGPD/Sécurité
- Données sensibles (tokens) ne sont pas stockées en clair
- Respect des bonnes pratiques de sécurité

### 3. Défense en Profondeur
Même si plusieurs couches de sécurité échouent:
- Firewall compromis ❌
- BD compromise ❌
- Tokens restent protégés ✅

---

## 🔍 Implémentation

### RefreshTokenService
```typescript
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  /**
   * Hasher un token pour stockage sécurisé
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Créer et stocker un refresh token
   */
  async create(data: { token: string; userId: number; expiresAt: Date }) {
    const hashedToken = this.hashToken(data.token);
    
    return this.prisma.refreshToken.create({
      data: {
        token: hashedToken,  // ← Hash stocké
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Vérifier si un token existe et est valide
   */
  async verify(token: string): Promise<boolean> {
    const hashedToken = this.hashToken(token);
    
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });

    return refreshToken && !refreshToken.isRevoked && !isExpired(refreshToken);
  }

  /**
   * Révoquer un token spécifique
   */
  async revoke(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    
    await this.prisma.refreshToken.update({
      where: { token: hashedToken },
      data: { isRevoked: true, revokedAt: new Date() },
    });
  }
}
```

---

## ✅ Checklist Sécurité

- [x] Tokens hashés avec SHA-256 avant stockage
- [x] Hash utilisé pour toutes les opérations (verify, revoke)
- [x] Token original jamais stocké en BD
- [x] Token original envoyé en HttpOnly cookie
- [x] Révocation fonctionne avec hash
- [x] Performance maintenue (hash rapide)
- [x] Logs ne révèlent pas les tokens

---

## 🎯 Résultat

**Sécurité maximale pour les refresh tokens:**
1. ✅ Token original en HttpOnly cookie (protection XSS)
2. ✅ Hash SHA-256 en BD (protection dump BD)
3. ✅ Révocation instantanée possible
4. ✅ Gestion sessions multiples
5. ✅ Conformité bonnes pratiques sécurité

**Si BD compromise:** Attaquant ne peut rien faire avec les hashs! 🔒
