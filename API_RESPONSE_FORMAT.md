# 📋 Format de Réponse API Standardisé

## 🎯 Objectif

Définir un format de réponse **universel et cohérent** pour tous les endpoints de l'API, facilitant l'intégration côté client et améliorant l'expérience développeur.

---

## ✅ Format de Réponse - Succès

### Structure Standard

```typescript
{
  success: boolean;        // true pour succès
  message: string;         // Message descriptif
  data: T;                 // Données de la réponse (any type)
  meta: {
    timestamp: string;     // ISO 8601
    path: string;          // Chemin de la requête
    method: string;        // GET, POST, PUT, DELETE, etc.
    duration?: number;     // Temps de traitement en ms (optionnel)
  }
}
```

### Exemples

**1. Réponse Simple**
```json
{
  "success": true,
  "message": "Provider créé avec succès",
  "data": {
    "id": 1,
    "name": "Salon Beauté",
    "email": "salon@example.com",
    "status": "pending_verification"
  },
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/providers",
    "method": "POST",
    "duration": 150
  }
}
```

**2. Réponse Liste (sans pagination)**
```json
{
  "success": true,
  "message": "Liste récupérée avec succès",
  "data": [
    { "id": 1, "name": "Item 1" },
    { "id": 2, "name": "Item 2" }
  ],
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/items",
    "method": "GET"
  }
}
```

**3. Réponse Message Uniquement**
```json
{
  "success": true,
  "message": "Opération réussie",
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/action",
    "method": "POST"
  }
}
```

---

## 📄 Format de Réponse - Pagination

### Structure Paginée

```typescript
{
  success: boolean;
  message: string;
  data: T[];               // Array d'éléments
  meta: {
    timestamp: string;
    path: string;
    method: string;
    duration?: number;
    pagination: {
      currentPage: number;    // Page actuelle
      perPage: number;        // Éléments par page
      total: number;          // Total d'éléments
      totalPages: number;     // Nombre total de pages
      hasNextPage: boolean;   // A une page suivante
      hasPreviousPage: boolean; // A une page précédente
    }
  }
}
```

### Exemple

```json
{
  "success": true,
  "message": "Liste des providers récupérée",
  "data": [
    { "id": 1, "name": "Provider 1" },
    { "id": 2, "name": "Provider 2" },
    { "id": 3, "name": "Provider 3" }
  ],
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/providers",
    "method": "GET",
    "duration": 45,
    "pagination": {
      "currentPage": 1,
      "perPage": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

## ❌ Format de Réponse - Erreur

### Structure Erreur

```typescript
{
  success: boolean;        // false pour erreur
  code: string;            // Code d'erreur applicatif
  statusCode: number;      // Code HTTP
  message: string;         // Message d'erreur
  timestamp: string;       // ISO 8601
  path?: string;           // Chemin de la requête
  details?: object;        // Détails additionnels (optionnel)
}
```

### Exemples

**1. Erreur de Validation (400)**
```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Les données fournies sont invalides",
  "timestamp": "2024-01-23T12:00:00.000Z",
  "path": "/api/v1/providers",
  "details": {
    "validationErrors": {
      "email": ["Email invalide"],
      "phone": ["Numéro de téléphone requis"]
    }
  }
}
```

**2. Ressource Non Trouvée (404)**
```json
{
  "success": false,
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "Provider introuvable",
  "timestamp": "2024-01-23T12:00:00.000Z",
  "path": "/api/v1/providers/999"
}
```

**3. Conflit (409)**
```json
{
  "success": false,
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Email déjà utilisé",
  "timestamp": "2024-01-23T12:00:00.000Z",
  "path": "/api/v1/providers",
  "details": {
    "field": "email",
    "value": "test@example.com"
  }
}
```

**4. Erreur Serveur (500)**
```json
{
  "success": false,
  "statusCode": 500,
  "code": "INTERNAL_SERVER_ERROR",
  "message": "Une erreur interne est survenue",
  "timestamp": "2024-01-23T12:00:00.000Z",
  "path": "/api/v1/providers"
}
```

---

## 🛠️ Utilisation Côté Backend

### 1. Réponse Automatique (via Intercepteur)

Les réponses sont **automatiquement transformées** par `ResponseTransformInterceptor`.

```typescript
@Get()
async findAll() {
  // Retourner directement les données
  return await this.service.findAll();
  
  // Sera transformé en:
  // {
  //   success: true,
  //   message: "Opération réussie",
  //   data: [...],
  //   meta: { timestamp, path, method, duration }
  // }
}
```

### 2. Réponse Manuelle (via Helper)

Pour plus de contrôle, utiliser `ApiResponseHelper`:

```typescript
import { ApiResponseHelper } from './common';

@Post()
async create(@Body() dto: CreateDto, @Req() request: Request) {
  const data = await this.service.create(dto);
  
  return ApiResponseHelper.success(
    data,
    'Provider créé avec succès',
    {
      path: request.path,
      method: request.method,
    }
  );
}
```

### 3. Réponse Paginée

```typescript
@Get()
async findAll(@Query() query: PaginationDto, @Req() request: Request) {
  const { items, total } = await this.service.findAll(query);
  
  const pagination = ApiResponseHelper.calculatePagination(
    total,
    query.page,
    query.perPage,
  );
  
  return ApiResponseHelper.paginated(
    items,
    pagination,
    'Liste récupérée avec succès',
    {
      path: request.path,
      method: request.method,
    }
  );
}
```

### 4. Réponse Message Uniquement

```typescript
@Delete(':id')
async delete(@Param('id') id: number, @Req() request: Request) {
  await this.service.delete(id);
  
  return ApiResponseHelper.message(
    'Provider supprimé avec succès',
    {
      path: request.path,
      method: request.method,
    }
  );
}
```

---

## 📱 Utilisation Côté Client

### TypeScript/JavaScript

```typescript
// Interface TypeScript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: {
    timestamp: string;
    path: string;
    method: string;
    duration?: number;
    pagination?: {
      currentPage: number;
      perPage: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

// Utilisation
async function getProviders() {
  const response = await fetch('/api/v1/providers');
  const result: ApiResponse<Provider[]> = await response.json();
  
  if (result.success) {
    console.log('Données:', result.data);
    console.log('Message:', result.message);
    
    if (result.meta.pagination) {
      console.log('Page:', result.meta.pagination.currentPage);
      console.log('Total:', result.meta.pagination.total);
    }
  } else {
    console.error('Erreur:', result.message);
  }
}
```

### React Hook

```typescript
function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const result: ApiResponse<T> = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetch };
}
```

---

## 🎨 Codes d'Erreur Standards

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Données invalides |
| `UNAUTHORIZED` | 401 | Non authentifié |
| `FORBIDDEN` | 403 | Accès interdit |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `CONFLICT` | 409 | Conflit (ex: email déjà utilisé) |
| `UNPROCESSABLE_ENTITY` | 422 | Entité non traitable |
| `TOO_MANY_REQUESTS` | 429 | Trop de requêtes |
| `INTERNAL_SERVER_ERROR` | 500 | Erreur serveur |
| `DATABASE_ERROR` | 500 | Erreur base de données |
| `EXTERNAL_SERVICE_ERROR` | 502 | Service externe indisponible |

---

## ✅ Avantages

### Pour les Développeurs Backend
- ✅ Format cohérent automatique
- ✅ Moins de code répétitif
- ✅ Métadonnées incluses automatiquement
- ✅ Facilite le debugging (duration, path, method)

### Pour les Développeurs Frontend
- ✅ Réponses prévisibles
- ✅ Gestion d'erreurs simplifiée
- ✅ Types TypeScript générables
- ✅ Pagination standardisée

### Pour l'API
- ✅ Documentation Swagger cohérente
- ✅ Logs structurés
- ✅ Monitoring facilité
- ✅ Respect des standards REST

---

## 🔧 Architecture SOLID

### SRP (Single Responsibility)
- `ApiResponseHelper` → Créer réponses
- `ResponseTransformInterceptor` → Transformer réponses
- `GlobalExceptionFilter` → Gérer erreurs

### OCP (Open/Closed)
- Extensible via nouveaux helpers
- Pas de modification du code existant

### ISP (Interface Segregation)
- DTOs séparés (Success, Paginated, Error)
- Interfaces spécifiques par cas d'usage

### DRY (Don't Repeat Yourself)
- Format centralisé
- Réutilisable partout
- Zéro duplication

---

## 📊 Exemples Réels

### Health Check
```bash
GET /api/v1/health
```
```json
{
  "success": true,
  "message": "API opérationnelle",
  "data": {
    "status": "ok",
    "service": "Beauty Platform API"
  },
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/health",
    "method": "GET",
    "duration": 2
  }
}
```

### Database Check
```bash
GET /api/v1/health/db
```
```json
{
  "success": true,
  "message": "Base de données connectée",
  "data": {
    "status": "healthy",
    "database": "connected",
    "latency": "5ms"
  },
  "meta": {
    "timestamp": "2024-01-23T12:00:00.000Z",
    "path": "/api/v1/health/db",
    "method": "GET",
    "duration": 5
  }
}
```

---

## 🚀 Migration

Pour migrer un endpoint existant:

**Avant:**
```typescript
@Get()
async findAll() {
  return { providers: await this.service.findAll() };
}
```

**Après (automatique):**
```typescript
@Get()
async findAll() {
  return await this.service.findAll(); // Transformé automatiquement
}
```

**Après (manuel):**
```typescript
@Get()
async findAll(@Req() request: Request) {
  const data = await this.service.findAll();
  return ApiResponseHelper.success(data, 'Liste récupérée', {
    path: request.path,
    method: request.method,
  });
}
```

Le format de réponse est maintenant **standardisé et production-ready**! 🎉
