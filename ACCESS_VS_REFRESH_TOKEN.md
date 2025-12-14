# 🔐 Access Token vs Refresh Token

## 🎯 Question: Comment Différencier?

**Réponse:** 3 mécanismes de différenciation

---

## 1️⃣ Secrets Différents

### Configuration (.env)
```env
# Access Token
JWT_SECRET=super-secret-access-key-change-in-production-abc123
JWT_EXPIRES_IN=1h

# Refresh Token (SECRET DIFFÉRENT!)
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production-xyz789
JWT_REFRESH_EXPIRES_IN=7d
```

### JwtTokenService
```typescript
// src/common/services/jwt-token.service.ts

@Injectable()
export class JwtTokenService {
  /**
   * Générer ACCESS token
   * Secret: JWT_SECRET
   */
  generateAccessToken(payload: {...}): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),        // ← Secret 1
      expiresIn: this.config.get('JWT_EXPIRES_IN'),
    });
  }

  /**
   * Générer REFRESH token
   * Secret: JWT_REFRESH_SECRET (différent!)
   */
  generateRefreshToken(userId: number): string {
    return this.jwtService.sign(
      { sub: userId },  // Payload minimal
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),  // ← Secret 2 (différent!)
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
      },
    );
  }

  /**
   * Vérifier ACCESS token
   */
  verifyAccessToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_SECRET'),  // ← Vérifie avec secret 1
    });
  }

  /**
   * Vérifier REFRESH token
   */
  verifyRefreshToken(token: string): { sub: number } {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_REFRESH_SECRET'),  // ← Vérifie avec secret 2
    });
  }
}
```

**Résultat:**
- ✅ Access token vérifié avec `JWT_SECRET`
- ✅ Refresh token vérifié avec `JWT_REFRESH_SECRET`
- ❌ Si tu utilises le mauvais secret → Erreur "Invalid signature"

---

## 2️⃣ Payload Différent

### Access Token - Payload Complet
```json
{
  "sub": 1,              // userId
  "role": "provider",    // Rôle
  "providerId": 5,       // ID spécifique
  "iat": 1732454400,
  "exp": 1732458000      // Expire dans 1h
}
```

### Refresh Token - Payload Minimal
```json
{
  "sub": 1,              // Seulement userId
  "iat": 1732454400,
  "exp": 1733059200      // Expire dans 7j
}
```

**Pourquoi minimal?**
- Refresh token sert UNIQUEMENT à obtenir un nouveau access token
- Pas besoin de role, providerId, etc.
- Plus léger = plus rapide

---

## 3️⃣ Endpoints Différents

### Access Token → Endpoints Protégés

```typescript
// src/providers/providers.controller.ts

@Controller('providers')
export class ProvidersController {
  /**
   * GET /providers/profile
   * Requiert ACCESS token dans Authorization header
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)  // ← Vérifie ACCESS token
  async getProfile(@Request() req) {
    // JwtStrategy utilise JWT_SECRET pour vérifier
    const providerId = req.user.providerId;
    return this.providersService.getProfile(providerId);
  }
}
```

### Refresh Token → Endpoint Refresh Uniquement

```typescript
// src/auth/auth.controller.ts

@Controller('auth')
export class AuthController {
  /**
   * POST /auth/refresh
   * Requiert REFRESH token dans cookie
   */
  @Post('refresh')
  async refresh(@Req() request: Request) {
    // ✅ Récupérer refresh token depuis cookie
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      // ✅ Vérifier avec JWT_REFRESH_SECRET
      const payload = this.jwtToken.verifyRefreshToken(refreshToken);
      
      // Récupérer user depuis DB
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      // Générer NOUVEAUX tokens
      const tokens = this.jwtToken.generateTokenPair({
        userId: user.id,
        role: 'provider',
        providerId: user.providerProfile.id,
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      // ❌ Si refresh token invalide ou expiré
      throw new UnauthorizedException('Refresh token invalide');
    }
  }
}
```

---

## 🔒 Sécurité: Que se Passe-t-il si...

### Scénario 1: Utiliser Access Token sur /auth/refresh

```typescript
// Frontend essaie d'utiliser access token comme refresh token
POST /auth/refresh
Cookie: refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJwcm92aWRlciIsInByb3ZpZGVySWQiOjUsImlhdCI6MTczMjQ1NDQwMCwiZXhwIjoxNzMyNDU4MDAwfQ...

// Backend
const payload = this.jwtToken.verifyRefreshToken(refreshToken);
// ❌ ERREUR: JsonWebTokenError: invalid signature
// Pourquoi? Access token signé avec JWT_SECRET, mais on vérifie avec JWT_REFRESH_SECRET
```

### Scénario 2: Utiliser Refresh Token sur Endpoint Protégé

```typescript
// Frontend essaie d'utiliser refresh token comme access token
GET /providers/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTczMjQ1NDQwMCwiZXhwIjoxNzMzMDU5MjAwfQ...

// Backend - JwtStrategy
async validate(payload: JwtPayload): Promise<JwtUser> {
  // ❌ ERREUR: JsonWebTokenError: invalid signature
  // Pourquoi? Refresh token signé avec JWT_REFRESH_SECRET, mais JwtStrategy vérifie avec JWT_SECRET
}
```

### Scénario 3: Token Expiré

```typescript
// Access token expiré (après 1h)
GET /providers/profile
Authorization: Bearer eyJhbGc...

// Backend
// ❌ ERREUR: TokenExpiredError: jwt expired
// → Frontend doit appeler /auth/refresh

// Refresh token expiré (après 7j)
POST /auth/refresh
Cookie: refreshToken=eyJhbGc...

// Backend
// ❌ ERREUR: TokenExpiredError: jwt expired
// → Utilisateur doit se reconnecter
```

---

## 📊 Tableau Récapitulatif

| Aspect | Access Token | Refresh Token |
|--------|-------------|---------------|
| **Secret** | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| **Durée** | 1h (courte) | 7j (longue) |
| **Payload** | Complet (role, providerId, etc.) | Minimal (userId uniquement) |
| **Stockage** | localStorage OU memory | HttpOnly Cookie |
| **Transmission** | Authorization header | Cookie automatique |
| **Endpoints** | Tous endpoints protégés | `/auth/refresh` uniquement |
| **Vérification** | JwtStrategy (JWT_SECRET) | Manuelle (JWT_REFRESH_SECRET) |

---

## 🔧 Flow Complet

### 1. Inscription/Login
```typescript
POST /providers/register
→ {
    accessToken: "eyJhbGc...",  // Signé avec JWT_SECRET
    refreshToken: "eyJhbGc...", // Signé avec JWT_REFRESH_SECRET
  }
```

### 2. Requête Normale
```typescript
GET /providers/profile
Authorization: Bearer <accessToken>

// Backend vérifie avec JWT_SECRET ✅
```

### 3. Access Token Expiré
```typescript
GET /providers/profile
Authorization: Bearer <accessToken_expiré>

// Backend: 401 Unauthorized
// Frontend: Appeler /auth/refresh
```

### 4. Rafraîchir Token
```typescript
POST /auth/refresh
Cookie: refreshToken=<refreshToken>

// Backend vérifie avec JWT_REFRESH_SECRET ✅
// Génère nouveau accessToken
→ { accessToken: "eyJhbGc..." }
```

### 5. Refresh Token Expiré
```typescript
POST /auth/refresh
Cookie: refreshToken=<refreshToken_expiré>

// Backend: 401 Unauthorized
// Frontend: Rediriger vers /login
```

---

## 💡 Pourquoi 2 Secrets Différents?

### Sécurité en Profondeur

1. **Isolation**
   - Si JWT_SECRET compromis → Seulement access tokens affectés
   - Refresh tokens restent valides

2. **Rotation**
   - Changer JWT_SECRET → Invalide tous les access tokens
   - Utilisateurs restent connectés via refresh token

3. **Séparation des Responsabilités**
   - Access token = Autorisation (courte durée)
   - Refresh token = Réauthentification (longue durée)

4. **Détection d'Abus**
   - Si quelqu'un essaie d'utiliser refresh token comme access token
   - Signature invalide → Détection immédiate

---

## ✅ Réponse à ta Question

**Comment savoir si c'est un refresh token ou access token?**

1. **Secret différent**
   - Access: vérifié avec `JWT_SECRET`
   - Refresh: vérifié avec `JWT_REFRESH_SECRET`
   - ❌ Mauvais secret = Erreur signature

2. **Payload différent**
   - Access: `{ sub, role, providerId, ... }`
   - Refresh: `{ sub }` (minimal)

3. **Endpoint différent**
   - Access: Tous endpoints protégés
   - Refresh: `/auth/refresh` uniquement

4. **Transmission différente**
   - Access: `Authorization: Bearer ...`
   - Refresh: `Cookie: refreshToken=...`

**Impossible de confondre les deux!** 🔐
