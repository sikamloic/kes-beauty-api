# 📚 Swagger Centralisé - Architecture SOLID

## 🎯 Architecture Implémentée

### 1. **Configuration Centralisée (SRP)**

```typescript
// src/config/swagger.config.ts
export class SwaggerConfig {
  static setup(app: INestApplication, config: SwaggerSetupOptions): void {
    // Configuration unique et réutilisable
  }
}
```

**Responsabilité unique:** Configuration documentation API

**Avantages:**
- ✅ Configuration en 1 seul endroit
- ✅ Facile à modifier (thème, tags, auth)
- ✅ Réutilisable pour tests E2E

---

### 2. **Décorateurs Réutilisables (DRY + OCP)**

```typescript
// src/common/decorators/api-responses.decorator.ts

// Erreurs standards (400, 401, 403, 500)
@ApiStandardErrors()

// 404 Not Found
@ApiNotFoundResponse('Provider')

// 409 Conflict
@ApiConflictResponse('Email déjà utilisé')

// 201 Created avec exemple
@ApiCreatedResponse('Créé', Type, example)

// 200 OK avec exemple
@ApiOkResponse('Succès', Type, example)

// Pagination
@ApiPaginatedResponse(Type)
```

**Principe OCP:** Extensible sans modifier existant

**Avantages:**
- ✅ Pas de duplication code
- ✅ Documentation cohérente
- ✅ Facile d'ajouter nouveaux décorateurs

---

### 3. **Configuration par Environnement**

```typescript
export const getSwaggerConfig = (env: string): SwaggerSetupOptions => {
  switch (env) {
    case 'production':
      return { serverUrl: 'https://api.beautyplatform.cm', ... };
    case 'staging':
      return { serverUrl: 'https://staging-api.beautyplatform.cm', ... };
    default: // development
      return { serverUrl: 'http://localhost:4000', ... };
  }
};
```

**Avantages:**
- ✅ URLs adaptées à l'environnement
- ✅ Swagger désactivé en production (sécurité)
- ✅ Configuration centralisée

---

## 💡 Utilisation

### Avant (répétitif)

```typescript
@Post('register')
@ApiResponse({
  status: 201,
  description: 'Provider créé',
  schema: { example: {...} }
})
@ApiResponse({
  status: 409,
  description: 'Conflit',
  type: ErrorResponseDto
})
@ApiResponse({
  status: 400,
  description: 'Invalide',
  type: ErrorResponseDto
})
@ApiResponse({
  status: 500,
  description: 'Erreur serveur',
  type: ErrorResponseDto
})
async register() {}
```

### Après (centralisé)

```typescript
@Post('register')
@ApiCreatedResponse('Provider créé', undefined, example)
@ApiConflictResponse('Téléphone ou email déjà utilisé')
@ApiStandardErrors() // 400, 401, 403, 500 automatiques
async register() {}
```

**Réduction:** 15 lignes → 4 lignes

---

## 🚀 Accès Swagger

### Development
```
http://localhost:4000/api/docs
```

### Staging
```
https://staging-api.beautyplatform.cm/api/docs
```

### Production
❌ **Désactivé** (sécurité)

---

## 📋 Tags Disponibles

- **Auth** - Authentification
- **Providers** - Prestataires
- **Clients** - Clients
- **Services** - Services
- **Appointments** - Réservations
- **Payments** - Paiements
- **Reviews** - Avis

---

## 🔐 Authentification JWT

Swagger configuré avec Bearer Auth:

```typescript
.addBearerAuth({
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
}, 'JWT-auth')
```

**Utilisation dans controller:**
```typescript
@ApiBearerAuth('JWT-auth')
@ApiAuthRequired()
@Get('profile')
async getProfile() {}
```

---

## 🎨 Personnalisation

### CSS Custom
```typescript
customCss: `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info { margin: 20px 0; }
`
```

### Options Swagger
```typescript
swaggerOptions: {
  persistAuthorization: true,  // Garde le token
  tagsSorter: 'alpha',         // Tri alphabétique
  operationsSorter: 'alpha',   // Tri endpoints
  docExpansion: 'none',        // Tout replié par défaut
  filter: true,                // Barre recherche
  tryItOutEnabled: true,       // Bouton "Try it out"
}
```

---

## ✅ Principes SOLID Respectés

### 1. **SRP (Single Responsibility)**
- `SwaggerConfig` → Configuration uniquement
- `api-responses.decorator.ts` → Décorateurs réutilisables
- Séparation claire des responsabilités

### 2. **OCP (Open/Closed)**
- Nouveaux décorateurs = nouvelle fonction
- Pas de modification des décorateurs existants
- Extensible facilement

### 3. **DRY (Don't Repeat Yourself)**
- `@ApiStandardErrors()` → 4 réponses en 1 décorateur
- `@ApiNotFoundResponse()` → Réutilisable partout
- Pas de duplication code

### 4. **DIP (Dependency Inversion)**
- Controllers dépendent des décorateurs abstraits
- Pas de dépendance directe sur Swagger
- Facile de changer implémentation

---

## 📊 Métriques

**Avant centralisation:**
- 15-20 lignes par endpoint
- Duplication code élevée
- Maintenance difficile

**Après centralisation:**
- 3-5 lignes par endpoint
- Zéro duplication
- Maintenance facile

**Gain:** ~75% de code en moins

---

## 🔄 Prochaines Étapes

1. ✅ Configuration centralisée
2. ✅ Décorateurs réutilisables
3. ✅ Documentation providers
4. ⏳ Ajouter DTOs response typés
5. ⏳ Ajouter exemples pour tous endpoints
6. ⏳ Générer SDK client depuis Swagger

---

## 📝 Exemple Complet

```typescript
@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  
  @Post('register')
  @ApiOperation({
    summary: 'Inscription provider',
    description: 'Créer compte provider avec validation',
  })
  @ApiCreatedResponse('Provider créé', undefined, {
    userId: 1,
    providerId: 1,
    status: 'pending_verification',
  })
  @ApiConflictResponse('Téléphone déjà utilisé')
  @ApiStandardErrors()
  async register(@Body() dto: RegisterProviderDto) {
    return this.service.register(dto);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiAuthRequired()
  @ApiOperation({ summary: 'Profil provider' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse('Profil récupéré')
  @ApiNotFoundResponse('Provider')
  @ApiStandardErrors()
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}
```

---

## ✅ Avantages Architecture

1. **Maintenabilité** - Code centralisé, facile à modifier
2. **Cohérence** - Documentation uniforme
3. **Productivité** - Moins de code à écrire
4. **Qualité** - Pas d'oubli de documentation
5. **Testabilité** - Décorateurs testables unitairement
6. **Scalabilité** - Facile d'ajouter nouveaux endpoints

Le système Swagger est maintenant **production-ready** et respecte parfaitement SOLID! 🎉
