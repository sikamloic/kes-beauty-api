# 🔐 Flow Authentification Provider

## 🎯 Problème Identifié

**Question:** Comment le provider met à jour ses infos sans JWT?

**Réponse:** Il ne peut PAS! Il faut retourner un JWT dès l'inscription.

---

## ✅ Solution: JWT dès l'Inscription

### 1. Inscription → Retourne JWT

```typescript
// POST /providers/register
{
  "fullName": "Marie Dupont",
  "phone": "683264591",
  "password": "Password123",
  "city": "Douala"
}

// Réponse
{
  "success": true,
  "data": {
    "user": {
      "userId": 1,
      "providerId": 1,
      "fullName": "Marie Dupont",
      "phone": "237683264591",
      "city": "Douala",
      "status": "pending_verification"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  },
  "message": "Inscription réussie! Vérifiez votre téléphone."
}
```

### 2. Toutes les Requêtes → Requiert JWT

```typescript
// PATCH /providers/profile
// Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
{
  "businessName": "Salon Beauté Royale",
  "bio": "Coiffeuse professionnelle..."
}

// Le JWT contient:
{
  "sub": 1,           // userId
  "providerId": 5,    // providerId
  "role": "provider",
  "iat": 1732454400,
  "exp": 1732458000
}
```

---

## 🔧 Implémentation

### 1. Service JWT (Common)

```typescript
// src/common/services/jwt.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Générer access token
   */
  generateAccessToken(payload: {
    userId: number;
    providerId?: number;
    role: string;
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '1h',
    });
  }

  /**
   * Générer refresh token
   */
  generateRefreshToken(payload: { userId: number }): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  /**
   * Générer paire de tokens
   */
  generateTokenPair(payload: {
    userId: number;
    providerId?: number;
    role: string;
  }) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ userId: payload.userId }),
      expiresIn: 3600, // 1 heure en secondes
    };
  }

  /**
   * Vérifier token
   */
  verifyToken(token: string): any {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
```

### 2. ProvidersService - Retourner JWT

```typescript
// src/providers/providers.service.ts
import { JwtTokenService } from '../common';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,
    private readonly sms: SmsService,
    private readonly providerValidator: ProviderValidatorService,
    private readonly jwtToken: JwtTokenService, // ✅ Injection
  ) {}

  async register(dto: RegisterProviderDto) {
    const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
    await this.ensurePhoneIsUnique(normalizedPhone);
    const passwordHash = await this.hashPassword(dto.password);
    
    const result = await this.createProviderInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });

    // ✅ Générer JWT
    const tokens = this.jwtToken.generateTokenPair({
      userId: result.userId,
      providerId: result.providerId,
      role: 'provider',
    });

    return {
      user: {
        userId: result.userId,
        providerId: result.providerId,
        fullName: dto.fullName,
        phone: result.phone,
        city: dto.city,
        status: 'pending_verification',
      },
      tokens, // ✅ Retourner les tokens
      message: 'Inscription réussie! Vérifiez votre téléphone.',
    };
  }
}
```

### 3. Guard JWT

```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

### 4. JWT Strategy

```typescript
// src/common/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      providerId: payload.providerId,
      role: payload.role,
    };
  }
}
```

### 5. Controller Protégé

```typescript
// src/providers/providers.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common';

@Controller('providers')
export class ProvidersController {
  /**
   * POST /providers/register
   * Pas de guard - Public
   */
  @Post('register')
  async register(@Body() dto: RegisterProviderDto) {
    return this.providersService.register(dto);
  }

  /**
   * PATCH /providers/profile
   * ✅ Requiert JWT
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard) // ✅ Protection
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
  ) {
    const providerId = req.user.providerId; // ✅ Depuis JWT
    return this.providersService.updateProfile(providerId, dto);
  }

  /**
   * GET /providers/me
   * ✅ Requiert JWT
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    const providerId = req.user.providerId;
    return this.providersService.getProfile(providerId);
  }
}
```

---

## 🔒 Sécurité

### Endpoints Publics (Sans JWT)
- ✅ `POST /providers/register` - Inscription
- ✅ `POST /auth/login` - Connexion
- ✅ `POST /auth/refresh` - Rafraîchir token

### Endpoints Protégés (Avec JWT)
- 🔒 `PATCH /providers/profile` - Mise à jour profil
- 🔒 `GET /providers/me` - Mon profil
- 🔒 `POST /providers/services` - Créer service
- 🔒 `GET /providers/appointments` - Mes rendez-vous
- 🔒 Tous les autres endpoints provider

---

## 📱 Flow Client (Frontend)

```typescript
// 1. Inscription
const response = await api.post('/providers/register', {
  fullName: "Marie Dupont",
  phone: "683264591",
  password: "Password123",
  city: "Douala"
});

// 2. Stocker tokens
localStorage.setItem('accessToken', response.data.tokens.accessToken);
localStorage.setItem('refreshToken', response.data.tokens.refreshToken);

// 3. Utiliser token pour toutes les requêtes
const updateResponse = await api.patch('/providers/profile', 
  { businessName: "Salon Beauté" },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`
    }
  }
);

// 4. Si token expiré → Rafraîchir
if (response.status === 401) {
  const newTokens = await api.post('/auth/refresh', {
    refreshToken: localStorage.getItem('refreshToken')
  });
  localStorage.setItem('accessToken', newTokens.data.accessToken);
  // Réessayer la requête
}
```

---

## ✅ Avantages

1. **Sécurité** - Impossible de modifier le profil d'un autre provider
2. **Stateless** - Pas besoin de session côté serveur
3. **Scalable** - JWT peut être vérifié sans DB
4. **Standard** - OAuth 2.0 / JWT est un standard
5. **Mobile-friendly** - Fonctionne parfaitement avec apps mobiles

---

## 🎯 Réponse à ta Question

**Question:** Comment le provider met à jour ses infos sans JWT?

**Réponse:** 
1. ❌ Il ne peut PAS sans JWT (sécurité)
2. ✅ L'inscription retourne un JWT
3. ✅ Le client stocke le JWT
4. ✅ Toutes les requêtes suivantes utilisent ce JWT
5. ✅ Le JWT contient `providerId` → identifie automatiquement le provider
6. ✅ Pas besoin de passer l'ID dans l'URL (sécurisé)

**Jamais utiliser l'ID côté client sans authentification!**
