# 🔐 Stockage Refresh Token en BD

## 🎯 Question: Faut-il Stocker en BD?

**Réponse: OUI pour la sécurité!**

---

## ❌ Sans Stockage BD

### Fonctionnement
```typescript
POST /auth/refresh
Cookie: refreshToken=eyJhbGc...

// Backend
1. Vérifier signature avec JWT_REFRESH_SECRET ✅
2. Vérifier expiration ✅
3. Si OK → Générer nouveau access token ✅

// Pas de vérification en BD
```

### Problèmes

**1. Impossible de Révoquer**
```typescript
// Utilisateur se déconnecte
POST /auth/logout
→ Supprime cookie côté client

// Mais si attaquant a copié le token...
POST /auth/refresh
Cookie: refreshToken=<token_copié>
→ ✅ Fonctionne encore! (valide 7 jours)
```

**2. Token Volé**
```typescript
// Token volé par XSS/Man-in-the-middle
// Valide jusqu'à expiration (7 jours)
// Impossible de l'invalider
```

**3. Pas de Limite d'Appareils**
```typescript
// Utilisateur se connecte sur 100 appareils
// Tous les refresh tokens restent valides
// Impossible de limiter
```

---

## ✅ Avec Stockage BD (RECOMMANDÉ)

### 1. Schéma Prisma

```prisma
// prisma/schema.prisma

model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique @db.VarChar(500)
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Métadonnées
  deviceInfo String?  @db.VarChar(255)  // User-Agent
  ipAddress  String?  @db.VarChar(45)   // IP
  
  // Dates
  expiresAt DateTime
  createdAt DateTime @default(now())
  lastUsedAt DateTime @default(now())
  
  // Révocation
  isRevoked Boolean  @default(false)
  revokedAt DateTime?
  
  @@map("refresh_tokens")
  @@index([userId])
  @@index([token])
}

model User {
  id            Int            @id @default(autoincrement())
  phone         String         @unique
  // ...
  refreshTokens RefreshToken[]
  
  @@map("users")
}
```

### 2. Migration SQL

```sql
-- Créer table refresh_tokens
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token)
);
```

### 3. Service RefreshToken

```typescript
// src/auth/services/refresh-token.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer et stocker refresh token
   */
  async create(data: {
    token: string;
    userId: number;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    return this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        expiresAt: data.expiresAt,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
      },
    });
  }

  /**
   * Vérifier si token existe et est valide
   */
  async verify(token: string): Promise<boolean> {
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!refreshToken) {
      return false; // Token n'existe pas
    }

    if (refreshToken.isRevoked) {
      return false; // Token révoqué
    }

    if (refreshToken.expiresAt < new Date()) {
      return false; // Token expiré
    }

    // ✅ Mettre à jour lastUsedAt
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }

  /**
   * Révoquer un token spécifique
   */
  async revoke(token: string) {
    return this.prisma.refreshToken.update({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Révoquer tous les tokens d'un utilisateur
   */
  async revokeAllForUser(userId: number) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Supprimer tokens expirés (cleanup)
   */
  async deleteExpired() {
    return this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Limiter nombre de tokens par utilisateur
   */
  async limitTokensPerUser(userId: number, maxTokens: number = 5) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'desc' },
    });

    // Si plus de maxTokens, supprimer les plus anciens
    if (tokens.length >= maxTokens) {
      const tokensToDelete = tokens.slice(maxTokens - 1);
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokensToDelete.map((t) => t.id) },
        },
      });
    }
  }

  /**
   * Obtenir sessions actives
   */
  async getActiveSessions(userId: number) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }
}
```

### 4. AuthController Mis à Jour

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtTokenService } from '../common';
import { RefreshTokenService } from './services/refresh-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtToken: JwtTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /auth/refresh
   */
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      // 1. Vérifier signature JWT
      const payload = this.jwtToken.verifyRefreshToken(refreshToken);

      // 2. ✅ Vérifier si token existe en BD et est valide
      const isValid = await this.refreshTokenService.verify(refreshToken);
      
      if (!isValid) {
        throw new UnauthorizedException('Refresh token invalide ou révoqué');
      }

      // 3. Récupérer utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { providerProfile: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Utilisateur invalide');
      }

      // 4. Générer nouveaux tokens
      const tokens = this.jwtToken.generateTokenPair({
        userId: user.id,
        role: 'provider',
        providerId: user.providerProfile.id,
      });

      // 5. ✅ Stocker nouveau refresh token en BD
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours

      await this.refreshTokenService.create({
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo: request.headers['user-agent'],
        ipAddress: request.ip,
      });

      // 6. ✅ Révoquer ancien refresh token
      await this.refreshTokenService.revoke(refreshToken);

      // 7. Limiter nombre de tokens (optionnel)
      await this.refreshTokenService.limitTokensPerUser(user.id, 5);

      // 8. Mettre à jour cookie
      response.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  /**
   * POST /auth/logout
   * Révoquer refresh token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refreshToken'];

    if (refreshToken) {
      // ✅ Révoquer en BD
      await this.refreshTokenService.revoke(refreshToken);
    }

    // Supprimer cookie
    response.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });

    return { message: 'Déconnexion réussie' };
  }

  /**
   * POST /auth/logout-all
   * Déconnecter de tous les appareils
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Request() req) {
    const userId = req.user.userId;

    // ✅ Révoquer tous les tokens
    await this.refreshTokenService.revokeAllForUser(userId);

    return { message: 'Déconnecté de tous les appareils' };
  }

  /**
   * GET /auth/sessions
   * Voir sessions actives
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async getSessions(@Request() req) {
    const userId = req.user.userId;

    const sessions = await this.refreshTokenService.getActiveSessions(userId);

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        device: s.deviceInfo,
        ip: s.ipAddress,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
      })),
    };
  }
}
```

### 5. ProvidersService Mis à Jour

```typescript
// src/providers/providers.service.ts

async register(dto: RegisterProviderDto) {
  // ... logique inscription ...

  // Générer tokens
  const tokens = this.jwtToken.generateTokenPair({
    userId: result.userId,
    role: 'provider',
    providerId: result.providerId,
  });

  // ✅ Stocker refresh token en BD
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await this.refreshTokenService.create({
    token: tokens.refreshToken,
    userId: result.userId,
    expiresAt,
  });

  return {
    user: { ... },
    tokens,
    message: 'Inscription réussie!',
  };
}
```

---

## 📊 Comparaison

| Aspect | Sans BD | Avec BD |
|--------|---------|---------|
| **Révoquer token** | ❌ Impossible | ✅ Possible |
| **Déconnexion forcée** | ❌ Non | ✅ Oui |
| **Limite appareils** | ❌ Non | ✅ Oui (5 max) |
| **Sessions actives** | ❌ Non | ✅ Oui |
| **Token volé** | ❌ Valide 7j | ✅ Révocable |
| **Complexité** | Faible | Moyenne |
| **Performance** | Rapide | Légèrement plus lent |
| **Sécurité** | ⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎯 Cas d'Usage

### Avec BD - Exemples Pratiques

**1. Déconnexion Sécurisée**
```typescript
// Utilisateur clique "Déconnexion"
POST /auth/logout
→ Token révoqué en BD ✅
→ Même si volé, ne fonctionne plus ✅
```

**2. Déconnexion de Tous les Appareils**
```typescript
// Utilisateur: "J'ai perdu mon téléphone"
POST /auth/logout-all
→ Tous les tokens révoqués ✅
→ Voleur ne peut plus se connecter ✅
```

**3. Limiter Appareils**
```typescript
// Utilisateur se connecte sur 6ème appareil
→ Plus ancien token supprimé automatiquement ✅
→ Max 5 appareils simultanés ✅
```

**4. Voir Sessions Actives**
```typescript
GET /auth/sessions
→ [
    { device: "iPhone 13", ip: "192.168.1.10", lastUsed: "2min ago" },
    { device: "Chrome Windows", ip: "192.168.1.20", lastUsed: "1h ago" }
  ]
```

**5. Détecter Token Volé**
```typescript
// Token utilisé depuis 2 IPs différentes en même temps
→ Alerte sécurité ✅
→ Révoquer automatiquement ✅
```

---

## ⚡ Performance

### Optimisations

**1. Index BD**
```sql
CREATE INDEX idx_token ON refresh_tokens(token);
CREATE INDEX idx_user_id ON refresh_tokens(user_id);
```

**2. Cleanup Automatique**
```typescript
// Cron job - Supprimer tokens expirés chaque jour
@Cron('0 0 * * *') // Minuit
async cleanupExpiredTokens() {
  await this.refreshTokenService.deleteExpired();
}
```

**3. Cache Redis (Optionnel)**
```typescript
// Mettre tokens en cache Redis pour vérification rapide
await redis.set(`refresh_token:${token}`, userId, 'EX', 604800); // 7j
```

---

## ✅ Recommandation

### Pour ton MVP

**Stocker en BD!**

**Pourquoi?**
- ✅ Sécurité essentielle (révocation)
- ✅ Pas de surcoût significatif
- ✅ Fonctionnalités utiles (sessions, logout-all)
- ✅ Standard industrie

**Implémentation:**
1. Créer table `refresh_tokens`
2. Stocker à la création
3. Vérifier à chaque refresh
4. Révoquer au logout

**Coût:** +1 requête BD par refresh (acceptable)

**Bénéfice:** Sécurité ++++ 🔐
