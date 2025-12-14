# 🔐 Sécurité des Tokens JWT

Documentation sur l'implémentation de la sécurité des tokens dans Beauty Platform API.

---

## 📋 Architecture des Tokens

### Deux Types de Tokens

**1. Access Token (JWT)**
- ⏱️ **Durée:** 15 minutes
- 📦 **Stockage:** Mémoire client (variable JavaScript)
- 🔒 **Usage:** Authentification des requêtes API
- 📡 **Transmission:** Header `Authorization: Bearer <token>`

**2. Refresh Token (JWT)**
- ⏱️ **Durée:** 7 jours
- 📦 **Stockage:** Cookie HttpOnly
- 🔒 **Usage:** Renouveler l'access token
- 📡 **Transmission:** Cookie automatique
- 💾 **Persistance:** Base de données (révocation possible)

---

## 🔄 Rotation des Refresh Tokens

### Principe

**Chaque fois qu'un refresh token est utilisé:**
1. ✅ Vérifier validité du token
2. ❌ **Révoquer immédiatement** l'ancien token
3. ✅ Générer un **nouveau** refresh token
4. ✅ Retourner nouveau access token + nouveau refresh token

### Pourquoi?

**Protection contre le vol de tokens:**

**Scénario sans rotation:**
```
1. Attaquant vole le refresh token
2. Attaquant l'utilise → ✅ Fonctionne
3. Utilisateur légitime l'utilise → ✅ Fonctionne aussi
4. ⚠️ Les deux peuvent utiliser le même token pendant 7 jours!
```

**Scénario avec rotation:**
```
1. Attaquant vole le refresh token
2. Attaquant l'utilise → ✅ Fonctionne (token révoqué après)
3. Utilisateur légitime l'utilise → ❌ "Token révoqué"
4. ✅ Détection immédiate du vol!
```

### Implémentation

**Code dans `auth.controller.ts`:**

```typescript
@Post('refresh')
async refresh(@Req() request: Request, @Res() response: Response) {
  const oldRefreshToken = request.cookies['refreshToken'];
  
  // 1. Vérifier validité
  const isValid = await this.refreshTokenService.verify(oldRefreshToken);
  
  if (!isValid) {
    throw new UnauthorizedException('Token invalide ou révoqué');
  }
  
  // 2. Générer nouveaux tokens
  const tokens = this.jwtToken.generateTokenPair({...});
  
  // 3. ROTATION: Révoquer l'ancien token
  await this.refreshTokenService.revoke(oldRefreshToken);
  
  // 4. Stocker le nouveau token
  await this.refreshTokenService.create({
    token: tokens.refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    deviceInfo: request.headers['user-agent'],
    ipAddress: request.ip,
  });
  
  // 5. Retourner nouveau refresh token en cookie
  response.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  
  return { accessToken: tokens.accessToken };
}
```

---

## 🛡️ Stockage Sécurisé

### Access Token

**❌ Ne PAS stocker dans:**
- LocalStorage (vulnérable XSS)
- SessionStorage (vulnérable XSS)
- Cookie non-HttpOnly (vulnérable XSS)

**✅ Stocker dans:**
- Variable JavaScript en mémoire
- State management (Redux, Zustand, etc.)

**Exemple React:**
```typescript
// ✅ Bon
const [accessToken, setAccessToken] = useState<string | null>(null);

// ❌ Mauvais
localStorage.setItem('accessToken', token); // Vulnérable XSS
```

### Refresh Token

**✅ UNIQUEMENT dans Cookie HttpOnly:**
```typescript
response.cookie('refreshToken', token, {
  httpOnly: true,    // ✅ Pas accessible via JavaScript (anti-XSS)
  secure: true,      // ✅ HTTPS uniquement
  sameSite: 'strict', // ✅ Protection CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
});
```

**Pourquoi HttpOnly?**
- ❌ JavaScript ne peut **pas** lire le cookie
- ✅ Protège contre les attaques XSS
- ✅ Envoyé automatiquement par le navigateur

---

## 🔒 Hachage des Tokens en DB

### Principe

**Les refresh tokens sont hachés avant stockage en DB:**

```typescript
// refresh-token.service.ts
import * as crypto from 'crypto';

async create(data: CreateRefreshTokenDto) {
  // Hacher le token avant stockage
  const hashedToken = crypto
    .createHash('sha256')
    .update(data.token)
    .digest('hex');
  
  await this.prisma.refreshToken.create({
    data: {
      token: hashedToken, // ✅ Hash stocké, pas le token original
      userId: data.userId,
      expiresAt: data.expiresAt,
      deviceInfo: data.deviceInfo,
      ipAddress: data.ipAddress,
    },
  });
}

async verify(token: string): Promise<boolean> {
  // Hacher le token reçu pour comparaison
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { token: hashedToken }, // ✅ Comparer les hashs
  });
  
  return storedToken && !storedToken.isRevoked;
}
```

### Pourquoi?

**Protection en cas de fuite de la DB:**

**Sans hachage:**
```
Attaquant accède à la DB
→ Voit les refresh tokens en clair
→ Peut les utiliser directement
→ ⚠️ Compromission totale
```

**Avec hachage:**
```
Attaquant accède à la DB
→ Voit uniquement les hashs
→ Ne peut pas retrouver les tokens originaux
→ ✅ Tokens inutilisables
```

---

## 🚨 Détection de Vol de Token

### Scénario de Détection

**1. Utilisateur légitime utilise le token:**
```
POST /auth/refresh
Cookie: refreshToken=abc123

→ ✅ Token valide
→ Token révoqué
→ Nouveau token: xyz789
```

**2. Attaquant essaie d'utiliser l'ancien token:**
```
POST /auth/refresh
Cookie: refreshToken=abc123

→ ❌ Token révoqué
→ Erreur: "Refresh token invalide ou révoqué"
```

**3. Utilisateur légitime essaie aussi l'ancien token:**
```
POST /auth/refresh
Cookie: refreshToken=abc123

→ ❌ Token révoqué
→ Erreur: "Refresh token invalide ou révoqué"
→ ⚠️ ALERTE: Possible vol de token détecté!
```

### Réponse Recommandée

**Quand un token révoqué est réutilisé:**

1. ✅ **Révoquer TOUS les tokens de l'utilisateur**
2. ✅ **Forcer déconnexion complète**
3. ✅ **Notifier l'utilisateur** (email/SMS)
4. ✅ **Logger l'incident** pour analyse

**Implémentation future:**
```typescript
async verify(token: string): Promise<boolean> {
  const hashedToken = this.hashToken(token);
  const storedToken = await this.prisma.refreshToken.findUnique({
    where: { token: hashedToken },
  });
  
  // Token révoqué réutilisé = possible vol
  if (storedToken && storedToken.isRevoked) {
    // ALERTE SÉCURITÉ
    await this.handleTokenTheft(storedToken.userId);
    throw new UnauthorizedException('Token révoqué - Possible vol détecté');
  }
  
  return storedToken && !storedToken.isRevoked;
}

private async handleTokenTheft(userId: number) {
  // 1. Révoquer tous les tokens
  await this.revokeAllUserTokens(userId);
  
  // 2. Logger incident
  this.logger.warn(`Possible vol de token détecté - User ${userId}`);
  
  // 3. Notifier utilisateur
  // await this.notificationService.send(...)
}
```

---

## 🔐 Protection CSRF

### Configuration CORS

**Cookies + CORS strict:**

```typescript
// main.ts
app.enableCors({
  origin: ['https://app.beautyplatform.cm'], // ✅ Domaines autorisés uniquement
  credentials: true,                          // ✅ Permet cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### SameSite Cookie

```typescript
response.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // ✅ Cookie envoyé uniquement depuis même domaine
});
```

**Protection:**
- ❌ Site malveillant ne peut **pas** envoyer le cookie
- ✅ Protège contre CSRF

---

## ⏱️ Expiration des Tokens

### Access Token: 15 minutes

**Pourquoi court?**
- ✅ Limite la fenêtre d'exploitation si volé
- ✅ Pas stocké en DB (pas de révocation possible)
- ✅ Renouvelé fréquemment via refresh token

### Refresh Token: 7 jours

**Pourquoi plus long?**
- ✅ Meilleure UX (pas de reconnexion fréquente)
- ✅ Stocké en DB (révocation possible)
- ✅ Rotation à chaque utilisation

### Nettoyage Automatique

**Supprimer les tokens expirés:**

```typescript
// refresh-token.service.ts
@Cron('0 0 * * *') // Tous les jours à minuit
async cleanupExpiredTokens() {
  const result = await this.prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },           // Expirés
        { isRevoked: true, revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // Révoqués > 30 jours
      ],
    },
  });
  
  this.logger.log(`${result.count} tokens expirés supprimés`);
}
```

---

## 🎯 Workflow Complet

### 1. Login Initial

```
Client → POST /auth/login
        { login, password }

Server → Vérifier credentials
      → Générer access token (15min)
      → Générer refresh token (7 jours)
      → Stocker refresh token en DB (haché)
      → Retourner access token + cookie refresh token

Client → Stocker access token en mémoire
      → Cookie refresh token stocké automatiquement
```

### 2. Requête API Authentifiée

```
Client → GET /providers/profile
        Header: Authorization: Bearer <accessToken>

Server → Vérifier signature access token
      → Vérifier expiration
      → Autoriser requête

Client → Reçoit données
```

### 3. Access Token Expiré

```
Client → GET /providers/profile
        Header: Authorization: Bearer <expiredToken>

Server → ❌ Token expiré
      → 401 Unauthorized

Client → Détecte 401
      → POST /auth/refresh (cookie refresh token envoyé auto)

Server → Vérifier refresh token
      → Révoquer ancien refresh token
      → Générer nouveaux tokens
      → Stocker nouveau refresh token
      → Retourner nouveau access token + cookie

Client → Stocker nouveau access token
      → Retry GET /providers/profile
```

### 4. Logout

```
Client → POST /auth/logout
        Cookie: refreshToken

Server → Révoquer refresh token en DB
      → Supprimer cookie

Client → Supprimer access token de la mémoire
```

### 5. Logout All Devices

```
Client → POST /auth/logout-all
        Header: Authorization: Bearer <accessToken>

Server → Identifier userId depuis access token
      → Révoquer TOUS les refresh tokens de l'utilisateur
      → Supprimer cookie

Client → Supprimer access token
      → Tous les autres appareils perdent accès
```

---

## 📊 Comparaison Sécurité

| Approche | XSS | CSRF | Vol DB | Révocation | Complexité |
|----------|-----|------|--------|------------|------------|
| **Access token localStorage** | ❌ Vulnérable | ✅ Protégé | ✅ Protégé | ❌ Impossible | ⭐ Simple |
| **Access token cookie** | ✅ Protégé | ❌ Vulnérable | ✅ Protégé | ❌ Impossible | ⭐⭐ Moyen |
| **Refresh token rotation (notre approche)** | ✅ Protégé | ✅ Protégé | ✅ Protégé | ✅ Possible | ⭐⭐⭐ Complexe |

---

## ✅ Checklist Sécurité

### Implémenté ✅

- [x] Access token courte durée (15min)
- [x] Refresh token longue durée (7 jours)
- [x] Refresh token en cookie HttpOnly
- [x] Refresh token haché en DB
- [x] Rotation des refresh tokens
- [x] Révocation des tokens
- [x] CORS strict avec credentials
- [x] SameSite=Strict sur cookies
- [x] Secure flag sur cookies (HTTPS)
- [x] Logout all devices
- [x] Sessions actives visibles

### À Implémenter 🔜

- [ ] Détection automatique de vol de token
- [ ] Révocation automatique en cas de vol détecté
- [ ] Notification utilisateur (email/SMS) en cas de vol
- [ ] Rate limiting sur /auth/refresh
- [ ] Limitation nombre de sessions simultanées
- [ ] Logs d'audit des authentifications
- [ ] Monitoring des tentatives suspectes
- [ ] Blacklist IP en cas d'abus

---

## 🚀 Recommandations Production

### 1. HTTPS Obligatoire

```typescript
// main.ts
if (env === 'production' && !request.secure) {
  throw new ForbiddenException('HTTPS requis');
}
```

### 2. Secrets Forts

```bash
# .env
JWT_SECRET=<256-bit random string>
JWT_REFRESH_SECRET=<256-bit random string différent>

# Générer:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Monitoring

```typescript
// Logger toutes les authentifications
this.logger.log(`Login réussi - User ${userId} - IP ${ip}`);
this.logger.warn(`Tentative login échouée - Login ${login} - IP ${ip}`);
this.logger.warn(`Token révoqué réutilisé - User ${userId} - IP ${ip}`);
```

### 4. Rate Limiting

```typescript
// auth.controller.ts
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentatives/minute
@Post('login')
async login() { ... }

@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh/minute
@Post('refresh')
async refresh() { ... }
```

---

**Dernière mise à jour:** 2024-12-03

**Statut:** ✅ Production-ready avec rotation des tokens implémentée
