# 🔐 Sécurité Stockage Tokens

## ❌ Problème: localStorage

```typescript
// ❌ DANGEREUX
localStorage.setItem('refreshToken', token);

// Vulnérabilités:
// 1. XSS - Script malveillant peut voler le token
// 2. Accessible par n'importe quel JavaScript
// 3. Persiste même après fermeture navigateur
```

---

## ✅ Solution: HttpOnly Cookies

### Avantages
- ✅ **Pas accessible par JavaScript** (protection XSS)
- ✅ **Envoyé automatiquement** par le navigateur
- ✅ **Secure flag** = HTTPS uniquement
- ✅ **SameSite** = Protection CSRF

---

## 🔧 Implémentation Backend

### 1. Mettre à jour ProvidersController

```typescript
// src/providers/providers.controller.ts
import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * POST /providers/register
   * Retourne access token en JSON + refresh token en cookie
   */
  @Post('register')
  async register(
    @Body() dto: RegisterProviderDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.providersService.register(dto);

    // ✅ Stocker refresh token en HttpOnly cookie
    this.setRefreshTokenCookie(response, result.tokens.refreshToken);

    // Retourner seulement access token en JSON
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
      message: result.message,
    };
  }

  /**
   * Helper: Définir cookie refresh token
   */
  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,      // ✅ Pas accessible par JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS en prod
      sameSite: 'strict',  // Protection CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      path: '/api/v1/auth', // Seulement endpoints auth
    });
  }
}
```

### 2. Créer AuthController pour Refresh

```typescript
// src/auth/auth.controller.ts
import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtTokenService } from '../common';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtToken: JwtTokenService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /auth/refresh
   * Rafraîchir l'access token avec le refresh token
   */
  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // ✅ Récupérer refresh token depuis cookie
    const refreshToken = request.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    try {
      // Vérifier refresh token
      const payload = this.jwtToken.verifyRefreshToken(refreshToken);

      // Récupérer utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          providerProfile: true,
          // clientProfile: true, // Si client
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Utilisateur invalide');
      }

      // Générer nouveaux tokens
      const tokens = this.jwtToken.generateTokenPair({
        userId: user.id,
        role: user.providerProfile ? 'provider' : 'client',
        providerId: user.providerProfile?.id,
        // clientId: user.clientProfile?.id,
      });

      // ✅ Mettre à jour refresh token cookie
      response.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      // Retourner nouveau access token
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
   * Supprimer le refresh token
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    // ✅ Supprimer cookie
    response.clearCookie('refreshToken', {
      path: '/api/v1/auth',
    });

    return {
      message: 'Déconnexion réussie',
    };
  }
}
```

---

## 📱 Implémentation Frontend

### Option 1: Access Token en Memory (PLUS SÉCURISÉ)

```typescript
// Frontend - Token en mémoire uniquement
let accessToken: string | null = null;

/**
 * Inscription
 */
async function register(data: RegisterDto) {
  const response = await fetch('http://localhost:4000/api/v1/providers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // ✅ Envoyer/recevoir cookies
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.success) {
    // ✅ Stocker access token en mémoire
    accessToken = result.data.accessToken;
    
    // ✅ Refresh token déjà en cookie HttpOnly
    console.log('Inscription réussie!');
  }
}

/**
 * Requête authentifiée
 */
async function makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
  // Si pas de token, essayer de rafraîchir
  if (!accessToken) {
    await refreshAccessToken();
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
    credentials: 'include', // ✅ Envoyer cookies
  });

  // Si 401, rafraîchir et réessayer
  if (response.status === 401) {
    await refreshAccessToken();
    
    // Réessayer avec nouveau token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });
  }

  return response;
}

/**
 * Rafraîchir access token
 */
async function refreshAccessToken() {
  const response = await fetch('http://localhost:4000/api/v1/auth/refresh', {
    method: 'POST',
    credentials: 'include', // ✅ Envoyer refresh token cookie
  });

  if (response.ok) {
    const result = await response.json();
    accessToken = result.data.accessToken;
  } else {
    // Refresh token invalide → Rediriger vers login
    accessToken = null;
    window.location.href = '/login';
  }
}

/**
 * Déconnexion
 */
async function logout() {
  await fetch('http://localhost:4000/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });

  accessToken = null;
  window.location.href = '/login';
}
```

### Option 2: Access Token en localStorage (MOINS SÉCURISÉ)

```typescript
// Frontend - Si tu veux quand même utiliser localStorage
async function register(data: RegisterDto) {
  const response = await fetch('http://localhost:4000/api/v1/providers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.success) {
    // ⚠️ Access token en localStorage (courte durée = moins risqué)
    localStorage.setItem('accessToken', result.data.accessToken);
    
    // ✅ Refresh token en HttpOnly cookie (plus sécurisé)
  }
}

async function makeAuthenticatedRequest(url: string) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (response.status === 401) {
    // Rafraîchir
    await refreshAccessToken();
    // Réessayer
  }

  return response;
}
```

---

## 📊 Comparaison Approches

| Approche | Access Token | Refresh Token | Sécurité | Complexité |
|----------|--------------|---------------|----------|------------|
| **Memory + HttpOnly Cookie** | Mémoire | HttpOnly Cookie | ⭐⭐⭐⭐⭐ | Moyenne |
| **localStorage + HttpOnly Cookie** | localStorage | HttpOnly Cookie | ⭐⭐⭐⭐ | Faible |
| **Tout en localStorage** | localStorage | localStorage | ⭐⭐ | Très faible |
| **Tout en HttpOnly Cookie** | HttpOnly Cookie | HttpOnly Cookie | ⭐⭐⭐⭐⭐ | Élevée |

---

## ✅ Recommandation

### Pour ton Projet (MVP)

**Option: localStorage (Access) + HttpOnly Cookie (Refresh)**

**Pourquoi?**
- ✅ **Simplicité** - Plus facile à implémenter
- ✅ **Sécurité acceptable** - Access token courte durée (1h)
- ✅ **Refresh token protégé** - HttpOnly cookie
- ✅ **Bon compromis** MVP vs sécurité

**Implémentation:**
```typescript
// Backend
@Post('register')
async register(@Body() dto, @Res({ passthrough: true }) res: Response) {
  const result = await this.providersService.register(dto);

  // ✅ Refresh token en HttpOnly cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  // Access token en JSON (frontend le met en localStorage)
  return {
    user: result.user,
    accessToken: result.tokens.accessToken,
    expiresIn: result.tokens.expiresIn,
  };
}
```

```typescript
// Frontend
localStorage.setItem('accessToken', data.accessToken); // ⚠️ Courte durée
// refreshToken déjà en cookie HttpOnly ✅
```

---

## 🎯 Réponse à ta Question

**Où stocker le refresh token?**

1. ✅ **HttpOnly Cookie** (RECOMMANDÉ)
   - Pas accessible par JavaScript
   - Protection XSS
   - Envoyé automatiquement

2. ❌ **localStorage** (À ÉVITER)
   - Vulnérable XSS
   - Accessible par tout script
   - Risque de vol

3. ⚠️ **Memory** (TRÈS SÉCURISÉ mais complexe)
   - Perdu au refresh page
   - Nécessite refresh automatique
   - Meilleure sécurité

**Pour ton MVP: HttpOnly Cookie pour refresh token!** 🔐
