# 🔐 Utilisation du Système JWT - Exemples

## ✅ Système Implémenté

### Architecture
```
src/
├── common/
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts     ✅ Types JWT
│   ├── services/
│   │   └── jwt-token.service.ts         ✅ Génération/validation tokens
│   ├── strategies/
│   │   └── jwt.strategy.ts              ✅ Passport strategy
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            ✅ Protection endpoints
│   │   └── roles.guard.ts               ✅ Vérification rôles
│   ├── decorators/
│   │   └── roles.decorator.ts           ✅ @Roles()
│   └── common.module.ts                 ✅ Module global
```

---

## 📝 Exemple 1: Inscription Provider (Retourne JWT)

### Controller
```typescript
// src/providers/providers.controller.ts
import { Controller, Post, Body } from '@nestjs/common';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  /**
   * POST /providers/register
   * Public - Pas de guard
   */
  @Post('register')
  async register(@Body() dto: RegisterProviderDto) {
    return this.providersService.register(dto);
  }
}
```

### Service
```typescript
// src/providers/providers.service.ts
async register(dto: RegisterProviderDto) {
  // ... logique inscription ...

  // ✅ Générer JWT
  const tokens = this.jwtToken.generateTokenPair({
    userId: result.userId,
    role: 'provider',
    providerId: result.providerId,
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
    tokens: {
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      expiresIn: 3600
    },
    message: 'Inscription réussie!',
  };
}
```

### Requête/Réponse
```bash
# Requête
POST http://localhost:4000/api/v1/providers/register
Content-Type: application/json

{
  "fullName": "Marie Dupont",
  "phone": "683264591",
  "password": "Password123",
  "city": "Douala"
}

# Réponse
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
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJwcm92aWRlciIsInByb3ZpZGVySWQiOjEsImlhdCI6MTczMjQ1NDQwMCwiZXhwIjoxNzMyNDU4MDAwfQ...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTczMjQ1NDQwMCwiZXhwIjoxNzMzMDU5MjAwfQ...",
      "expiresIn": 3600
    },
    "message": "Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS."
  }
}
```

---

## 🔒 Exemple 2: Endpoint Protégé (Requiert JWT)

### Controller
```typescript
// src/providers/providers.controller.ts
import { 
  Controller, 
  Patch, 
  Body, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../common';

@Controller('providers')
export class ProvidersController {
  /**
   * PATCH /providers/profile
   * Protégé - Seulement providers authentifiés
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider')
  async updateProfile(
    @Request() req,
    @Body() dto: UpdateProfileDto,
  ) {
    // req.user contient les données du JWT
    const providerId = req.user.providerId;
    return this.providersService.updateProfile(providerId, dto);
  }
}
```

### Requête/Réponse
```bash
# Requête
PATCH http://localhost:4000/api/v1/providers/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "businessName": "Salon Beauté Royale",
  "bio": "Coiffeuse professionnelle avec 10 ans d'expérience"
}

# Réponse
{
  "success": true,
  "data": {
    "providerId": 1,
    "businessName": "Salon Beauté Royale",
    "bio": "Coiffeuse professionnelle avec 10 ans d'expérience",
    "updatedAt": "2024-11-24T14:30:00Z"
  }
}

# Si pas de token ou token invalide
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized",
    "statusCode": 401
  }
}

# Si mauvais rôle (ex: client essaie d'accéder)
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Forbidden resource",
    "statusCode": 403
  }
}
```

---

## 🎯 Exemple 3: Multi-rôles (Provider OU Admin)

### Controller
```typescript
@Controller('providers')
export class ProvidersController {
  /**
   * GET /providers/:id/statistics
   * Accessible par le provider lui-même OU un admin
   */
  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('provider', 'admin')
  async getStatistics(
    @Request() req,
    @Param('id') id: number,
  ) {
    const user = req.user;
    
    // Provider ne peut voir que ses propres stats
    if (user.role === 'provider' && user.providerId !== id) {
      throw new ForbiddenException('Accès refusé');
    }
    
    // Admin peut voir toutes les stats
    return this.providersService.getStatistics(id);
  }
}
```

---

## 📱 Exemple 4: Client Frontend

### Inscription
```typescript
// Frontend - Inscription
async function registerProvider(data) {
  const response = await fetch('http://localhost:4000/api/v1/providers/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fullName: "Marie Dupont",
      phone: "683264591",
      password: "Password123",
      city: "Douala"
    }),
  });

  const result = await response.json();

  if (result.success) {
    // ✅ Stocker les tokens
    localStorage.setItem('accessToken', result.data.tokens.accessToken);
    localStorage.setItem('refreshToken', result.data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.data.user));
    
    console.log('Inscription réussie!', result.data.user);
  }
}
```

### Requête Authentifiée
```typescript
// Frontend - Mise à jour profil
async function updateProfile(data) {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:4000/api/v1/providers/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`, // ✅ Envoyer le token
    },
    body: JSON.stringify({
      businessName: "Salon Beauté Royale",
      bio: "Coiffeuse professionnelle..."
    }),
  });

  const result = await response.json();

  if (response.status === 401) {
    // Token expiré → Rafraîchir
    await refreshToken();
    // Réessayer la requête
  }

  return result;
}
```

### Rafraîchir Token
```typescript
// Frontend - Rafraîchir le token
async function refreshToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:4000/api/v1/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  const result = await response.json();

  if (result.success) {
    localStorage.setItem('accessToken', result.data.accessToken);
    localStorage.setItem('refreshToken', result.data.refreshToken);
  } else {
    // Refresh token invalide → Déconnecter
    logout();
  }
}
```

---

## 🔧 Exemple 5: Créer Endpoint Client (Même Logique)

### Service Client
```typescript
// src/clients/clients.service.ts
import { Injectable } from '@nestjs/common';
import { JwtTokenService } from '../common';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtToken: JwtTokenService,
  ) {}

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
}
```

### Controller Client
```typescript
// src/clients/clients.controller.ts
@Controller('clients')
export class ClientsController {
  /**
   * POST /clients/appointments
   * Protégé - Seulement clients
   */
  @Post('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('client')
  async bookAppointment(
    @Request() req,
    @Body() dto: BookAppointmentDto,
  ) {
    const clientId = req.user.clientId;
    return this.appointmentsService.book(clientId, dto);
  }
}
```

---

## 📊 Résumé

### Endpoints Publics (Sans JWT)
```typescript
// ✅ Pas de guard
@Post('register')
async register() { }

@Post('login')
async login() { }
```

### Endpoints Protégés (Avec JWT)
```typescript
// 🔒 Requiert JWT
@UseGuards(JwtAuthGuard)
@Get('me')
async getMe() { }

// 🔒 Requiert JWT + Rôle spécifique
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider')
@Patch('profile')
async updateProfile() { }

// 🔒 Requiert JWT + Un des rôles
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('provider', 'admin')
@Get('statistics')
async getStats() { }
```

### Structure JWT
```json
{
  "sub": 1,              // userId
  "role": "provider",    // Rôle principal
  "providerId": 5,       // Si provider
  "clientId": 8,         // Si client
  "iat": 1732454400,
  "exp": 1732458000
}
```

### Accès aux Données JWT
```typescript
@UseGuards(JwtAuthGuard)
async someMethod(@Request() req) {
  const userId = req.user.userId;
  const role = req.user.role;
  const providerId = req.user.providerId; // Si provider
  const clientId = req.user.clientId;     // Si client
}
```

---

## ✅ Système Prêt!

- ✅ JWT généré à l'inscription
- ✅ Guards pour protéger endpoints
- ✅ Rôles pour différencier providers/clients
- ✅ Même structure pour tous
- ✅ Sécurisé et scalable
