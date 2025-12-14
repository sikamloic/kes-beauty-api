# 🔐 Structure JWT Unifiée

## 🎯 Principe: Un Seul Format JWT

**Même nomenclature** pour tous les utilisateurs (providers, clients, admins).

**Différenciation par le champ `role`.**

---

## 📋 Structure JWT

### Payload Standard

```typescript
interface JwtPayload {
  sub: number;           // userId (TOUJOURS présent)
  role: UserRole;        // 'provider' | 'client' | 'admin'
  providerId?: number;   // Seulement si role = 'provider'
  clientId?: number;     // Seulement si role = 'client'
  iat: number;           // Issued at
  exp: number;           // Expiration
}

type UserRole = 'provider' | 'client' | 'admin';
```

---

## 📊 Exemples par Rôle

### 1. Provider

```json
{
  "sub": 1,
  "role": "provider",
  "providerId": 5,
  "iat": 1732454400,
  "exp": 1732458000
}
```

**Accès:**
- ✅ Endpoints `/providers/*`
- ✅ Peut gérer ses services
- ✅ Peut voir ses rendez-vous
- ❌ Ne peut PAS réserver (c'est un provider, pas un client)

### 2. Client

```json
{
  "sub": 2,
  "role": "client",
  "clientId": 8,
  "iat": 1732454400,
  "exp": 1732458000
}
```

**Accès:**
- ✅ Endpoints `/clients/*`
- ✅ Peut réserver des services
- ✅ Peut voir ses rendez-vous
- ❌ Ne peut PAS créer de services

### 3. Admin

```json
{
  "sub": 3,
  "role": "admin",
  "iat": 1732454400,
  "exp": 1732458000
}
```

**Accès:**
- ✅ Tous les endpoints
- ✅ Peut valider les providers
- ✅ Peut modérer les avis
- ✅ Accès dashboard admin

### 4. Provider + Client (Dual Role)

Un provider peut aussi être client!

```json
{
  "sub": 4,
  "role": "provider",        // Rôle principal
  "roles": ["provider", "client"],  // Tous les rôles
  "providerId": 10,
  "clientId": 12,
  "iat": 1732454400,
  "exp": 1732458000
}
```

---

## 🔧 Implémentation

### 1. Interface TypeScript

```typescript
// src/common/interfaces/jwt-payload.interface.ts

export type UserRole = 'provider' | 'client' | 'admin';

export interface JwtPayload {
  sub: number;           // userId
  role: UserRole;        // Rôle principal
  roles?: UserRole[];    // Tous les rôles (si multi-rôles)
  providerId?: number;   // Si provider
  clientId?: number;     // Si client
  iat: number;
  exp: number;
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### 2. Service JWT Unifié

```typescript
// src/common/services/jwt-token.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, JwtTokenPair, UserRole } from '../interfaces';

@Injectable()
export class JwtTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Générer JWT pour n'importe quel utilisateur
   */
  generateAccessToken(payload: {
    userId: number;
    role: UserRole;
    providerId?: number;
    clientId?: number;
    roles?: UserRole[];
  }): string {
    const jwtPayload: Partial<JwtPayload> = {
      sub: payload.userId,
      role: payload.role,
    };

    // Ajouter providerId si provider
    if (payload.providerId) {
      jwtPayload.providerId = payload.providerId;
    }

    // Ajouter clientId si client
    if (payload.clientId) {
      jwtPayload.clientId = payload.clientId;
    }

    // Ajouter roles si multi-rôles
    if (payload.roles && payload.roles.length > 1) {
      jwtPayload.roles = payload.roles;
    }

    return this.jwtService.sign(jwtPayload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: '1h',
    });
  }

  /**
   * Générer refresh token
   */
  generateRefreshToken(userId: number): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
  }

  /**
   * Générer paire de tokens
   */
  generateTokenPair(payload: {
    userId: number;
    role: UserRole;
    providerId?: number;
    clientId?: number;
    roles?: UserRole[];
  }): JwtTokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload.userId),
      expiresIn: 3600,
    };
  }

  /**
   * Vérifier et décoder token
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.config.get('JWT_SECRET'),
    });
  }
}
```

### 3. Utilisation dans ProvidersService

```typescript
// src/providers/providers.service.ts

async register(dto: RegisterProviderDto) {
  // ... logique inscription ...

  // ✅ Générer JWT avec role = provider
  const tokens = this.jwtToken.generateTokenPair({
    userId: result.userId,
    role: 'provider',
    providerId: result.providerId,
  });

  return {
    user: { ... },
    tokens,
    message: 'Inscription réussie!',
  };
}
```

### 4. Utilisation dans ClientsService

```typescript
// src/clients/clients.service.ts

async register(dto: RegisterClientDto) {
  // ... logique inscription ...

  // ✅ Générer JWT avec role = client
  const tokens = this.jwtToken.generateTokenPair({
    userId: result.userId,
    role: 'client',
    clientId: result.clientId,
  });

  return {
    user: { ... },
    tokens,
    message: 'Inscription réussie!',
  };
}
```

---

## 🔒 Guards par Rôle

### 1. Guard Générique JWT

```typescript
// src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### 2. Guard par Rôle

```typescript
// src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../interfaces';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Vérifier rôle principal
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Vérifier rôles multiples
    if (user.roles) {
      return requiredRoles.some((role) => user.roles.includes(role));
    }

    return false;
  }
}
```

### 3. Décorateur Rôles

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../interfaces';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
```

---

## 🎯 Utilisation dans Controllers

### Provider Controller

```typescript
// src/providers/providers.controller.ts
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../common';

@Controller('providers')
export class ProvidersController {
  /**
   * Public - Pas de guard
   */
  @Post('register')
  async register(@Body() dto: RegisterProviderDto) {
    return this.providersService.register(dto);
  }

  /**
   * Protégé - Seulement providers
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    const providerId = req.user.providerId;
    return this.providersService.updateProfile(providerId, dto);
  }

  /**
   * Protégé - Providers OU Admins
   */
  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider', 'admin')
  async getStatistics(@Request() req) {
    const providerId = req.user.providerId;
    return this.providersService.getStatistics(providerId);
  }
}
```

### Client Controller

```typescript
// src/clients/clients.controller.ts

@Controller('clients')
export class ClientsController {
  /**
   * Protégé - Seulement clients
   */
  @Post('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async bookAppointment(@Request() req, @Body() dto: BookAppointmentDto) {
    const clientId = req.user.clientId;
    return this.appointmentsService.book(clientId, dto);
  }
}
```

### Appointments Controller (Multi-rôles)

```typescript
// src/appointments/appointments.controller.ts

@Controller('appointments')
export class AppointmentsController {
  /**
   * Protégé - Clients ET Providers peuvent voir leurs RDV
   */
  @Get('my-appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client', 'provider')
  async getMyAppointments(@Request() req) {
    const user = req.user;
    
    if (user.role === 'client') {
      return this.appointmentsService.getClientAppointments(user.clientId);
    } else if (user.role === 'provider') {
      return this.appointmentsService.getProviderAppointments(user.providerId);
    }
  }
}
```

---

## 📊 Comparaison

| Aspect | Approche |
|--------|----------|
| **Structure JWT** | ✅ Identique pour tous |
| **Différenciation** | ✅ Par champ `role` |
| **Secret JWT** | ✅ Même secret |
| **Durée validité** | ✅ Même durée (1h) |
| **Refresh token** | ✅ Même logique |
| **Guards** | ✅ Même JwtAuthGuard + RolesGuard |
| **Endpoints** | ❌ Différents par rôle |

---

## ✅ Avantages

1. **Simplicité** - Un seul système JWT
2. **Maintenabilité** - Pas de duplication
3. **Flexibilité** - Multi-rôles possible
4. **Sécurité** - Même niveau pour tous
5. **Scalabilité** - Facile d'ajouter nouveaux rôles

---

## 🎯 Réponse à ta Question

**Question:** Les tokens clients et providers ont la même nomenclature?

**Réponse:**
- ✅ **Oui, même structure JWT**
- ✅ **Même secret, même durée**
- ✅ **Différenciation par `role`**
- ✅ **Un seul JwtTokenService**
- ✅ **Guards basés sur les rôles**

**Exemple:**
```typescript
// Provider
{ sub: 1, role: "provider", providerId: 5 }

// Client
{ sub: 2, role: "client", clientId: 8 }

// Même format, juste le rôle change!
```
