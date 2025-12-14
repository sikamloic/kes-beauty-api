# 🔌 Gestion des Erreurs Prisma & Connexion BD

## ✅ Intégration Complète

Le système de gestion des erreurs prend maintenant en charge **toutes les erreurs Prisma et de connexion BD**.

---

## 📋 Erreurs Prisma Gérées

### 1. **Erreurs Connues (PrismaClientKnownRequestError)**

| Code | Type | HTTP Status | Description |
|------|------|-------------|-------------|
| P2002 | UniqueConstraintException | 409 Conflict | Contrainte unique violée (email déjà utilisé) |
| P2003 | ForeignKeyConstraintException | 422 Unprocessable | Contrainte FK violée (référence invalide) |
| P2025 | RecordNotFoundException | 404 Not Found | Enregistrement introuvable |
| P2024 | ConnectionTimeoutException | 504 Gateway Timeout | Timeout connexion BD |
| P2034 | TransactionFailedException | 500 Internal Error | Transaction échouée |
| P2037 | TooManyConnectionsException | 503 Service Unavailable | Trop de connexions BD |

### 2. **Erreurs de Validation (PrismaClientValidationError)**
- Erreur validation requête (types, contraintes)
- HTTP 500 Internal Server Error

### 3. **Erreurs d'Initialisation (PrismaClientInitializationError)**

| Code | Type | HTTP Status | Description |
|------|------|-------------|-------------|
| P1001 | DatabaseConnectionException | 503 Service Unavailable | Impossible de se connecter à MySQL |
| P1002 | DatabaseAuthenticationException | 500 Internal Error | Erreur authentification (user/password) |
| P1003 | DatabaseNotFoundException | 500 Internal Error | Base de données inexistante |

### 4. **Erreurs Critiques (PrismaClientRustPanicError)**
- Erreur critique moteur BD
- HTTP 500 Internal Server Error

---

## 💡 Exemples d'Utilisation

### 1. Contrainte Unique Violée (P2002)

**Code:**
```typescript
// Tentative création user avec email existant
await prisma.user.create({
  data: {
    email: 'existing@example.com',
    phone: '+237600000000',
  },
});
```

**Erreur Prisma:**
```
PrismaClientKnownRequestError: Unique constraint failed on the fields: (`email`)
code: 'P2002'
meta: { target: ['email'] }
```

**Réponse HTTP:**
```json
{
  "statusCode": 409,
  "code": "UNIQUE_CONSTRAINT_VIOLATION",
  "message": "Contrainte unique violée sur: email",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/users",
  "details": {
    "fields": ["email"]
  }
}
```

---

### 2. Erreur Connexion BD (P1001)

**Scénario:** MySQL n'est pas démarré

**Erreur Prisma:**
```
PrismaClientInitializationError: Can't reach database server at `localhost:3306`
errorCode: 'P1001'
```

**Réponse HTTP:**
```json
{
  "statusCode": 503,
  "code": "DATABASE_CONNECTION_ERROR",
  "message": "Impossible de se connecter à la base de données: Can't reach database server",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/appointments",
  "details": {
    "errorCode": "P1001",
    "hint": "Vérifier que MySQL est démarré et accessible"
  }
}
```

---

### 3. Authentification BD Échouée (P1002)

**Scénario:** Mauvais user/password dans DATABASE_URL

**Erreur Prisma:**
```
PrismaClientInitializationError: Authentication failed against database server
errorCode: 'P1002'
```

**Réponse HTTP:**
```json
{
  "statusCode": 500,
  "code": "DATABASE_AUTHENTICATION_ERROR",
  "message": "Erreur authentification base de données: Authentication failed",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "details": {
    "errorCode": "P1002",
    "hint": "Vérifier DATABASE_URL (user/password)"
  }
}
```

---

### 4. Base de Données Inexistante (P1003)

**Scénario:** BD spécifiée dans DATABASE_URL n'existe pas

**Erreur Prisma:**
```
PrismaClientInitializationError: Database `beauty_platform` does not exist
errorCode: 'P1003'
```

**Réponse HTTP:**
```json
{
  "statusCode": 500,
  "code": "DATABASE_NOT_FOUND",
  "message": "Base de données introuvable: Database beauty_platform does not exist",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "details": {
    "errorCode": "P1003",
    "hint": "Créer la base de données ou vérifier DATABASE_URL"
  }
}
```

---

### 5. Record Non Trouvé (P2025)

**Code:**
```typescript
await prisma.appointment.update({
  where: { id: 999 },
  data: { status: 'confirmed' },
});
```

**Erreur Prisma:**
```
PrismaClientKnownRequestError: Record to update not found
code: 'P2025'
```

**Réponse HTTP:**
```json
{
  "statusCode": 404,
  "code": "RECORD_NOT_FOUND",
  "message": "Enregistrement introuvable",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/appointments/999"
}
```

---

### 6. Trop de Connexions (P2037)

**Scénario:** Pool de connexions saturé

**Erreur Prisma:**
```
PrismaClientKnownRequestError: Too many database connections opened
code: 'P2037'
```

**Réponse HTTP:**
```json
{
  "statusCode": 503,
  "code": "TOO_MANY_CONNECTIONS",
  "message": "Trop de connexions à la base de données",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "details": {
    "hint": "Augmenter connection_limit dans DATABASE_URL ou fermer connexions inutilisées"
  }
}
```

---

## 🔍 Détection Automatique

Le `GlobalExceptionFilter` détecte automatiquement les erreurs Prisma via:

```typescript
private isPrismaError(exception: unknown): boolean {
  const errorName = (exception as Error).name;
  
  return (
    errorName?.startsWith('Prisma') ||
    'code' in exception ||           // P2002, P2003, etc.
    'clientVersion' in exception ||  // Propriété Prisma
    'errorCode' in exception         // P1001, P1002, etc.
  );
}
```

---

## 🛠️ Workflow Complet

```
1. Requête HTTP → Controller → Service
                                  ↓
2. Service appelle Prisma      prisma.user.create(...)
                                  ↓
3. Erreur Prisma lancée        PrismaClientKnownRequestError (P2002)
                                  ↓
4. GlobalExceptionFilter       isPrismaError() → true
   capture l'erreur               ↓
                              PrismaExceptionHandler.handle()
                                  ↓
5. Conversion en exception    UniqueConstraintException
   custom appropriée              ↓
6. Réponse HTTP formatée      409 Conflict + JSON standardisé
```

---

## ✅ Avantages

1. **Automatique** - Aucun try-catch nécessaire dans les services
2. **Cohérent** - Toutes les erreurs Prisma formatées pareil
3. **Informatif** - Messages clairs + hints pour résolution
4. **Production-ready** - Détails techniques masqués en prod
5. **Maintenable** - Ajout nouveau code Prisma = 1 case dans switch

---

## 🚀 Utilisation dans les Services

### ❌ AVANT (répétitif)
```typescript
async createUser(dto: CreateUserDto) {
  try {
    return await this.prisma.user.create({ data: dto });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ConflictException('Email déjà utilisé');
    }
    if (error.code === 'P1001') {
      throw new ServiceUnavailableException('BD inaccessible');
    }
    throw new InternalServerErrorException();
  }
}
```

### ✅ APRÈS (centralisé)
```typescript
async createUser(dto: CreateUserDto) {
  // Pas de try-catch, GlobalExceptionFilter + PrismaExceptionHandler gèrent tout
  return this.prisma.user.create({ data: dto });
}
```

---

## 📝 Notes Importantes

1. **Types temporaires** - Le fichier utilise des types custom car `@prisma/client` n'est pas encore installé
2. **Migration future** - Après installation Prisma, remplacer:
   ```typescript
   // AVANT
   type PrismaError = Error & { code?: string; ... }
   
   // APRÈS
   import { Prisma } from '@prisma/client';
   ```
3. **Build OK** - Le code compile sans erreurs et est prêt à l'emploi

---

## 🔗 Références

- [Prisma Error Reference](https://www.prisma.io/docs/reference/api-reference/error-reference)
- Codes P1xxx: Erreurs connexion/initialisation
- Codes P2xxx: Erreurs requêtes (contraintes, records)
