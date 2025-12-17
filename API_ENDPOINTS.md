# 📡 API Endpoints Documentation

**Base URL:** `http://localhost:4000/api/v1`

**Version:** 1.0.0

**Environnement:** Development

---

## 📑 Table des Matières

1. [Auth Module](#auth-module) - 7 endpoints
2. [Providers Module](#providers-module) - 22 endpoints
   - [Profile](#profile) - 3 endpoints
   - [Services](#services) - 6 endpoints
   - [Specialties](#specialties) - 5 endpoints
   - [Availability](#provider-availability) - 7 endpoints
   - [Business Types](#business-types) - 1 endpoint

**Total:** 29 endpoints

---

## 🌍 Internationalisation (i18n)

L'API supporte le multilinguisme pour certaines ressources via le header HTTP `Accept-Language`.

**Langues supportées:**
- `fr` - Français (par défaut)
- `en` - Anglais

**Utilisation:**
```http
GET /business-types
Accept-Language: en
```

**Ressources multilingues:**
- ✅ Business Types (`/business-types`)
- ✅ Service Categories (`/providers/services/categories/list`)

**Comportement:**
- Si le header est absent → Français par défaut
- Si la langue n'est pas supportée → Français par défaut
- Format accepté: `fr`, `en`, `fr-FR`, `en-US` (seul le code langue est utilisé)

---

# 🔐 Auth Module

## 1. Login

**Endpoint:** `POST /auth/login`

**Description:** Authentification avec phone/email et mot de passe. Retourne access token (JWT) et refresh token (cookie HttpOnly).

**Auth Required:** ❌ Non

**Body (JSON):**
```json
{
  "login": "string",      // OBLIGATOIRE - Phone (+237XXXXXXXXX) ou Email
  "password": "string"    // OBLIGATOIRE - Mot de passe
}
```

**Validation:**
- `login`: min 3 caractères, max 255
- `password`: min 8 caractères, max 100

**Response Success (200):**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    "user": {
      "phone": "237683264591",
      "role": "provider",
      "providerId": 3,
      "clientId": null
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  },
  "meta": {
    "timestamp": "2025-12-04T16:00:00.000Z",
    "path": "/api/v1/auth/login",
    "method": "POST",
    "duration": 45
  }
}
```

**Note:** L'`userId` n'est pas exposé dans la réponse pour des raisons de sécurité. Il est disponible dans le payload du JWT décodé.

**Response Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Identifiants incorrects"
  }
}
```

**Cookies Set:**
- `refreshToken` (HttpOnly, Secure, SameSite=Strict, 7 jours)

---

## 2. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Rafraîchir l'access token avec le refresh token (cookie). Implémente la **rotation des tokens** : l'ancien refresh token est révoqué et un nouveau est généré.

**Auth Required:** ❌ Non (utilise cookie)

**⚠️ Sécurité - Token Rotation:**
- L'ancien refresh token est **immédiatement révoqué**
- Un nouveau refresh token est généré et retourné
- Si l'ancien token est réutilisé → erreur "token révoqué"
- Protège contre le vol de tokens

**Body:** Aucun

**Cookies Required:**
- `refreshToken` (OBLIGATOIRE)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response Error (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Refresh token invalide ou expiré"
  }
}
```

---

## 3. Logout

**Endpoint:** `POST /auth/logout`

**Description:** Déconnexion (révoque le refresh token actuel).

**Auth Required:** ❌ Non (utilise cookie)

**Body:** Aucun

**Cookies Required:**
- `refreshToken` (OBLIGATOIRE)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Déconnexion réussie"
  }
}
```

**Cookies Cleared:**
- `refreshToken`

---

## 4. Logout All Devices

**Endpoint:** `POST /auth/logout-all`

**Description:** Déconnexion de tous les appareils (révoque tous les refresh tokens).

**Auth Required:** ✅ Oui (JWT Bearer)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Déconnexion de tous les appareils réussie",
    "revokedCount": 3
  }
}
```

---

## 5. Active Sessions

**Endpoint:** `GET /auth/sessions`

**Description:** Liste des sessions actives (refresh tokens non expirés).

**Auth Required:** ✅ Oui (JWT Bearer)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "ipAddress": "192.168.1.100",
        "createdAt": "2024-12-01T10:00:00Z",
        "lastUsedAt": "2024-12-03T14:30:00Z",
        "expiresAt": "2024-12-08T10:00:00Z",
        "isCurrent": true
      },
      {
        "id": 2,
        "deviceInfo": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...)...",
        "ipAddress": "192.168.1.101",
        "createdAt": "2024-11-30T08:00:00Z",
        "lastUsedAt": "2024-12-02T20:00:00Z",
        "expiresAt": "2024-12-07T08:00:00Z",
        "isCurrent": false
      }
    ],
    "total": 2
  }
}
```

---

## 6. Send Verification Code

**Endpoint:** `POST /auth/send-verification-code`

**Description:** Envoyer un code de vérification SMS (mode mock en développement).

**Auth Required:** ❌ Non

**Body (JSON):**
```json
{
  "phone": "string"    // OBLIGATOIRE - Format: +237XXXXXXXXX
}
```

**Validation:**
- `phone`: Format E.164 (+237XXXXXXXXX)

**Response Success (200) - Mode Mock:**
```json
{
  "success": true,
  "data": {
    "message": "Code envoyé avec succès",
    "phone": "+237683264591",
    "expiresIn": 300,
    "mockCode": "123456"
  }
}
```

**Response Success (200) - Mode Production:**
```json
{
  "success": true,
  "data": {
    "message": "Code envoyé avec succès",
    "phone": "+237683264591",
    "expiresIn": 300
  }
}
```

**Response Error (429):**
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_ATTEMPTS",
    "message": "Trop de tentatives. Réessayez dans 1 minute"
  }
}
```

---

## 7. Verify Phone

**Endpoint:** `POST /auth/verify-phone`

**Description:** Vérifier le code SMS reçu.

**Auth Required:** ❌ Non

**Body (JSON):**
```json
{
  "phone": "string",    // OBLIGATOIRE - Format: +237XXXXXXXXX
  "code": "string"      // OBLIGATOIRE - Code à 6 chiffres
}
```

**Validation:**
- `phone`: Format E.164
- `code`: Exactement 6 chiffres

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "message": "Téléphone vérifié avec succès"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Code incorrect ou expiré"
  }
}
```

**Response Error (429):**
```json
{
  "success": false,
  "error": {
    "code": "MAX_ATTEMPTS_REACHED",
    "message": "Nombre maximum de tentatives atteint"
  }
}
```

---

# 👤 Providers Module

## Profile

### 1. Register Provider

**Endpoint:** `POST /providers/register`

**Description:** Inscription simplifiée d'un nouveau provider (< 2 minutes). Infos minimales requises, le reste sera complété après validation.

**Auth Required:** ❌ Non

**Body (JSON):**
```json
{
  "fullName": "Marie Dupont",         // OBLIGATOIRE - Nom complet (2-100 caractères)
  "phone": "+237655443322",           // OBLIGATOIRE - Téléphone camerounais
  "password": "Password123",          // OBLIGATOIRE - Min 6 caractères
  "city": "Douala"                    // OBLIGATOIRE - Ville d'activité
}
```

**Formats téléphone acceptés:**
- `+237655443322` (format international)
- `237655443322` (sans +)
- `00237655443322` (préfixe 00)
- `655443322` (9 chiffres locaux)

**Villes disponibles:**
- Douala
- Yaoundé
- Bafoussam
- Bamenda
- Garoua
- Autre

**Validation:**
- `fullName`: 2-100 caractères
- `phone`: Format camerounais valide, unique
- `password`: Min 6 caractères, max 100
- `city`: Requis

**Response Success (201):**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    "user": {
      "providerId": 3,
      "fullName": "Marie Dupont",
      "phone": "237655443322",
      "city": "Douala",
      "status": "pending_verification"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800,
    "message": "Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS."
  },
  "meta": {
    "timestamp": "2025-12-04T16:00:00.000Z",
    "path": "/api/v1/providers/register",
    "method": "POST",
    "duration": 234
  }
}
```

**Cookies Set:**
- `refreshToken` (HttpOnly, Secure, SameSite=Strict, 7 jours)

**Note Sécurité:**
- `userId` non exposé (disponible dans le JWT)
- `refreshToken` uniquement en cookie HttpOnly (pas dans la réponse JSON)

**Response Error (409):**
```json
{
  "success": false,
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Ce numéro de téléphone est déjà utilisé",
  "timestamp": "2025-12-04T16:00:00.000Z",
  "path": "/api/v1/providers/register"
}
```

**Note:** L'utilisateur est automatiquement connecté après inscription (tokens retournés).

---

### 2. Get Provider Profile

**Endpoint:** `GET /providers/profile`

**Description:** Récupérer le profil complet du provider connecté.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "businessName": "Salon Afro Beauty",
    "businessType": {
      "id": 2,
      "code": "salon",
      "label": "Gerant d'un salon",
      "icon": "scissors"
    },
    "bio": "Spécialiste coiffure afro depuis 8 ans...",
    "yearsExperience": 8,
    "address": "Bastos, Rue 1234",
    "city": "Yaoundé",
    "neighborhood": "Bastos",
    "latitude": "3.8667",
    "longitude": "11.5167",
    "phone": "+237683264591",
    "email": "provider@example.com",
    "phoneVerifiedAt": "2024-12-01T10:00:00Z",
    "emailVerifiedAt": null,
    "isActive": true,
    "lastLoginAt": "2024-12-03T14:00:00Z",
    "createdAt": "2024-11-01T10:00:00Z"
  }
}
```

**Note:** La réponse simplifiée ne retourne plus les objets `verification`, `statistics` et `serviceSettings` qui seront gérés par des endpoints dédiés.

---

### 2b. Get Provider Full Profile (avec relations)

**Endpoint:** `GET /providers/profile/full`

**Description:** Récupérer le profil complet avec toutes les relations (verification, statistics, settings).

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "businessName": "Salon Afro Beauty",
    "businessType": {
      "id": 2,
      "code": "salon",
      "label": "Gerant d'un salon",
      "icon": "scissors"
    },
    "bio": "Spécialiste coiffure afro depuis 8 ans...",
    "yearsExperience": 8,
    "address": "Bastos, Rue 1234",
    "city": "Yaoundé",
    "neighborhood": "Bastos",
    "latitude": "3.8667",
    "longitude": "11.5167",
    "phone": "+237683264591",
    "email": "provider@example.com",
    "phoneVerifiedAt": "2024-12-01T10:00:00Z",
    "emailVerifiedAt": null,
    "isActive": true,
    "lastLoginAt": "2024-12-03T14:00:00Z",
    "createdAt": "2024-11-01T10:00:00Z",
    "verification": {
      "status": "approved",
      "verifiedAt": "2024-12-02T15:00:00Z"
    },
    "statistics": {
      "averageRating": "4.85",
      "totalReviews": 156,
      "totalBookings": 342,
      "totalCompleted": 320
    },
    "serviceSettings": {
      "offersHomeService": true,
      "homeServiceRadiusKm": 10,
      "autoAcceptBookings": false,
      "bookingAdvanceDays": 30
    },
    "createdAt": "2024-11-01T10:00:00Z",
    "updatedAt": "2024-12-03T14:00:00Z"
  }
}
```

---

### 3. Update Provider Profile

**Endpoint:** `PUT /providers/profile`

**Description:** Mettre à jour le profil du provider.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (JSON) - Tous champs optionnels:**
```json
{
  "businessName": "string",      // OPTIONNEL - Nom commercial
  "businessTypeId": 1,           // OPTIONNEL - Type de business (ID)
  "bio": "string",               // OPTIONNEL - Biographie
  "yearsExperience": 0,          // OPTIONNEL - Années d'expérience (0-50)
  "address": "string",           // OPTIONNEL - Adresse
  "city": "string",              // OPTIONNEL - Ville
  "neighborhood": "string",      // OPTIONNEL - Quartier
  "latitude": 0.0,               // OPTIONNEL - Latitude (-90 à 90)
  "longitude": 0.0               // OPTIONNEL - Longitude (-180 à 180)
}
```

**Validation:**
- `businessName`: Max 255 caractères
- `businessTypeId`: Min 1 (doit exister dans business_types)
- `bio`: Max 2000 caractères
- `yearsExperience`: 0-50
- `city`: Max 100 caractères
- `neighborhood`: Max 100 caractères
- `latitude`: -90 à 90
- `longitude`: -180 à 180

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "businessName": "Salon Afro Beauty Premium",
    "businessType": {
      "id": 2,
      "code": "salon",
      "label": "Gerant d'un salon",
      "icon": "scissors"
    },
    "bio": "Nouvelle bio mise à jour...",
    "yearsExperience": 10,
    "city": "Yaoundé",
    "neighborhood": "Bastos",
    "address": "Rue de la Paix, Bastos",
    "latitude": "3.8667",
    "longitude": "11.5167",
    "phone": "237683264591",
    "email": "salon@example.com",
    "phoneVerifiedAt": "2024-12-01T10:00:00Z",
    "emailVerifiedAt": null,
    "isActive": true,
    "lastLoginAt": "2024-12-03T14:00:00Z",
    "createdAt": "2024-12-01T10:00:00Z"
  }
}
```

---

## Services

### 1. List Provider Services

**Endpoint:** `GET /providers/services`

**Description:** Liste des services du provider connecté avec pagination.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `includeInactive` | boolean | Non | Inclure les services inactifs (défaut: false) |
| `page` | number | Non | Numéro de page (défaut: 1) |
| `limit` | number | Non | Nombre par page (défaut: 20, max: 100) |

**Exemples:**
```
GET /providers/services
GET /providers/services?includeInactive=true
GET /providers/services?page=2&limit=10
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": 1,
        "name": "Tresses Box Braids",
        "description": "Tresses africaines traditionnelles, durée 3-4 heures",
        "price": "15000",
        "duration": 180,
        "isActive": true,
        "category": {
          "id": 6,
          "code": "coiffure_afro",
          "name": "Cheveux Afro",
          "icon": "scissors"
        },
        "createdAt": "2024-11-15T10:00:00Z",
        "updatedAt": "2024-12-01T14:00:00Z"
      },
      {
        "id": 2,
        "name": "Vanilles",
        "description": "Coiffure vanilles classiques",
        "price": "8000",
        "duration": 120,
        "isActive": true,
        "category": {
          "id": 6,
          "code": "coiffure_afro",
          "name": "Cheveux Afro",
          "icon": "scissors"
        },
        "createdAt": "2024-11-15T10:30:00Z",
        "updatedAt": "2024-11-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

### 2. Create Service

**Endpoint:** `POST /providers/services`

**Description:** Créer un nouveau service.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (JSON):**
```json
{
  "categoryId": 0,          // OBLIGATOIRE - ID catégorie (min: 1)
  "name": "string",         // OBLIGATOIRE - Nom du service (3-255 caractères)
  "description": "string",  // OPTIONNEL - Description (10-1000 caractères)
  "price": 0,               // OBLIGATOIRE - Prix en FCFA (0-1000000)
  "duration": 0             // OBLIGATOIRE - Durée en minutes (15-480)
}
```

**Validation:**
- `categoryId`: Min 1
- `name`: 3-255 caractères
- `description`: 10-1000 caractères (si fourni)
- `price`: 0-1000000
- `duration`: 15-480 minutes

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Locks Entretien",
    "description": "Entretien et resserrage de locks",
    "price": "10000",
    "duration": 90,
    "isActive": true,
    "category": {
      "id": 6,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "createdAt": "2024-12-03T16:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Catégorie non trouvée"
  }
}
```

---

### 3. Get Service Details

**Endpoint:** `GET /providers/services/:id`

**Description:** Détails d'un service spécifique.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (obligatoire): ID du service

**Exemple:**
```
GET /providers/services/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tresses Box Braids",
    "description": "Tresses africaines traditionnelles",
    "price": "15000",
    "duration": 180,
    "isActive": true,
    "category": {
      "id": 6,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "createdAt": "2024-11-15T10:00:00Z",
    "updatedAt": "2024-12-01T14:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "Service non trouvé"
  }
}
```

---

### 4. Update Service

**Endpoint:** `PUT /providers/services/:id`

**Description:** Mettre à jour un service.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (obligatoire): ID du service

**Body (JSON) - Tous champs optionnels:**
```json
{
  "categoryId": 0,          // OPTIONNEL - ID catégorie
  "name": "string",         // OPTIONNEL - Nom du service
  "description": "string",  // OPTIONNEL - Description
  "price": 0,               // OPTIONNEL - Prix en FCFA
  "duration": 0,            // OPTIONNEL - Durée en minutes
  "isActive": true          // OPTIONNEL - Service actif/inactif
}
```

**Validation:**
- `categoryId`: Min 1
- `name`: 3-255 caractères
- `description`: 10-1000 caractères
- `price`: 0-1000000
- `duration`: 15-480 minutes
- `isActive`: boolean

**Exemple:**
```
PUT /providers/services/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Tresses Box Braids Premium",
    "description": "Tresses africaines avec extensions premium",
    "price": "18000",
    "duration": 180,
    "isActive": true,
    "category": {
      "id": 6,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "updatedAt": "2024-12-03T16:30:00Z"
  }
}
```

---

### 5. Delete Service

**Endpoint:** `DELETE /providers/services/:id`

**Description:** Supprimer un service (soft delete).

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (obligatoire): ID du service

**Exemple:**
```
DELETE /providers/services/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Service supprimé avec succès"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_NOT_FOUND",
    "message": "Service non trouvé"
  }
}
```

---

### 6. List Service Categories

**Endpoint:** `GET /providers/services/categories/list`

**Description:** Liste hiérarchique des catégories de services disponibles avec traductions multilingues. **Endpoint public** - utilisé lors de l'inscription des providers et par les clients pour la recherche.

**Auth Required:** ❌ Non (endpoint public)

**Headers (optionnels):**
```
Accept-Language: fr    // Langue souhaitée (fr, en). Défaut: fr
```

**Query Parameters:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "coiffure",
      "name": "Coiffure",
      "description": "Services de coiffure professionnels",
      "icon": "scissors",
      "children": [
        {
          "id": 6,
          "code": "coiffure_afro",
          "name": "Cheveux Afro",
          "icon": "scissors"
        },
        {
          "id": 7,
          "code": "coiffure_lisse",
          "name": "Cheveux Lisses",
          "icon": "scissors"
        },
        {
          "id": 8,
          "code": "coiffure_enfant",
          "name": "Coiffure Enfant",
          "icon": "child"
        }
      ]
    },
    {
      "id": 2,
      "code": "esthetique",
      "name": "Esthétique",
      "description": "Soins esthétiques et beauté",
      "icon": "spa",
      "children": [
        {
          "id": 9,
          "code": "soins_visage",
          "name": "Soins Visage",
          "icon": "face"
        },
        {
          "id": 10,
          "code": "epilation",
          "name": "Épilation",
          "icon": "spa"
        }
      ]
    },
    {
      "id": 3,
      "code": "manucure_pedicure",
      "name": "Manucure & Pédicure",
      "description": "Soins des mains et pieds",
      "icon": "hand",
      "children": []
    }
  ]
}
```

**Notes:**
- Endpoint public accessible sans authentification
- Structure hiérarchique avec catégories principales et sous-catégories
- Seules les catégories actives sont retournées
- **Support multilingue:** Utiliser le header `Accept-Language` (fr, en)
- Utilisé lors de l'inscription provider et pour la recherche client

---

### 7. Popular Services

**Endpoint:** `GET /providers/services/popular`

**Description:** Récupère les services les plus réservés avec filtres optionnels. Basé sur le nombre de rendez-vous (completed, confirmed, in_progress). **Endpoint public** - utilisé pour la page d'accueil et la découverte.

**Auth Required:** ❌ Non (endpoint public)

**Headers (optionnels):**
```
Accept-Language: fr    // Langue souhaitée (fr, en). Défaut: fr
```

**Query Parameters:**
| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `limit` | number | Non | Nombre de services à retourner (défaut: 10, max: 50) |
| `categoryId` | number | Non | Filtrer par ID de catégorie |
| `city` | string | Non | Filtrer par ville (recherche partielle) |
| `minPrice` | number | Non | Prix minimum en FCFA |
| `maxPrice` | number | Non | Prix maximum en FCFA |
| `maxDuration` | number | Non | Durée maximum en minutes |

**Exemples:**
```
GET /providers/services/popular
GET /providers/services/popular?limit=5
GET /providers/services/popular?city=Yaoundé&limit=10
GET /providers/services/popular?categoryId=1&maxPrice=10000
GET /providers/services/popular?minPrice=5000&maxDuration=60
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tresses Box Braids",
      "description": "Tresses africaines traditionnelles, durée 3-4 heures",
      "price": "15000",
      "duration": 180,
      "bookingsCount": 45,
      "category": {
        "id": 6,
        "code": "coiffure_afro",
        "name": "Cheveux Afro",
        "icon": "scissors"
      },
      "provider": {
        "id": 1,
        "businessName": "Salon Beauté Excellence",
        "location": "Bastos, Yaoundé",
        "rating": "4.50",
        "reviewsCount": 12
      }
    },
    {
      "id": 5,
      "name": "Manucure Gel",
      "description": "Pose de vernis gel longue durée",
      "price": "8000",
      "duration": 60,
      "bookingsCount": 32,
      "category": {
        "id": 3,
        "code": "manucure_pedicure",
        "name": "Manucure & Pédicure",
        "icon": "hand"
      },
      "provider": {
        "id": 3,
        "businessName": "Nails Paradise",
        "location": "Bonapriso, Douala",
        "rating": "4.80",
        "reviewsCount": 28
      }
    }
  ]
}
```

**Notes:**
- Endpoint public accessible sans authentification
- Trié par nombre de réservations (décroissant)
- Seuls les services actifs de providers actifs sont retournés
- `bookingsCount` représente le nombre de rendez-vous réussis
- Le filtre `city` effectue une recherche partielle (contient)
- **Support multilingue:** Utiliser le header `Accept-Language` (fr, en)

---

## Specialties

### 1. List Provider Specialties

**Endpoint:** `GET /providers/specialties`

**Description:** Liste des spécialités/compétences du provider avec badges.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "category": {
        "id": 6,
        "code": "coiffure_afro",
        "name": "Cheveux Afro",
        "icon": "scissors",
        "parent": {
          "id": 1,
          "code": "coiffure",
          "name": "Coiffure"
        }
      },
      "yearsExperience": 8,
      "isPrimary": true,
      "badge": "Spécialiste Certifié",
      "createdAt": "2024-12-03T10:00:00Z"
    },
    {
      "id": 2,
      "category": {
        "id": 7,
        "code": "coiffure_lisse",
        "name": "Cheveux Lisses",
        "icon": "scissors",
        "parent": {
          "id": 1,
          "code": "coiffure",
          "name": "Coiffure"
        }
      },
      "yearsExperience": 3,
      "isPrimary": false,
      "badge": "Confirmé",
      "createdAt": "2024-12-03T10:05:00Z"
    }
  ],
  "total": 2
}
```

**Badges possibles:**
- `Expert Certifié` - 10+ ans + spécialité principale
- `Spécialiste Certifié` - 5-9 ans + spécialité principale
- `Expert` - 10+ ans
- `Spécialiste` - 5-9 ans
- `Confirmé` - 2-4 ans
- `Débutant` - 0-1 an

---

### 2. Add Specialty

**Endpoint:** `POST /providers/specialties`

**Description:** Ajouter une spécialité/compétence.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (JSON):**
```json
{
  "categoryId": 0,          // OBLIGATOIRE - ID catégorie (min: 1)
  "yearsExperience": 0,     // OPTIONNEL - Années d'expérience (0-50, défaut: 0)
  "isPrimary": false        // OPTIONNEL - Spécialité principale (défaut: false)
}
```

**Validation:**
- `categoryId`: Min 1
- `yearsExperience`: 0-50
- `isPrimary`: boolean

**Note:** Si `isPrimary=true`, les autres spécialités sont automatiquement mises à `isPrimary=false`.

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category": {
      "id": 6,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "yearsExperience": 8,
    "isPrimary": true,
    "createdAt": "2024-12-03T10:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Catégorie non trouvée ou inactive"
  }
}
```

**Response Error (409):**
```json
{
  "success": false,
  "error": {
    "code": "SPECIALTY_ALREADY_EXISTS",
    "message": "Cette spécialité existe déjà"
  }
}
```

---

### 3. Add Multiple Specialties (Bulk)

**Endpoint:** `POST /providers/specialties/bulk`

**Description:** Ajouter plusieurs spécialités en une seule requête (max 10). Toutes les opérations sont effectuées en transaction atomique.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (JSON):**
```json
{
  "specialties": [
    {
      "categoryId": 6,
      "yearsExperience": 8,
      "isPrimary": true
    },
    {
      "categoryId": 7,
      "yearsExperience": 5
    },
    {
      "categoryId": 8,
      "yearsExperience": 3
    }
  ]
}
```

**Validation:**
- `specialties`: Array de 1 à 10 éléments
- Chaque élément suit les mêmes règles que `POST /providers/specialties`
- Maximum 1 spécialité avec `isPrimary: true`
- Pas de doublons de `categoryId`

**Response Success (201):**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    "count": 3,
    "specialties": [
      {
        "id": 1,
        "category": {
          "id": 6,
          "code": "coiffure_afro",
          "name": "Cheveux Afro",
          "icon": "scissors"
        },
        "yearsExperience": 8,
        "isPrimary": true,
        "createdAt": "2025-12-04T17:00:00Z"
      },
      {
        "id": 2,
        "category": {
          "id": 7,
          "code": "maquillage",
          "name": "Maquillage",
          "icon": "palette"
        },
        "yearsExperience": 5,
        "isPrimary": false,
        "createdAt": "2025-12-04T17:00:00Z"
      },
      {
        "id": 3,
        "category": {
          "id": 8,
          "code": "manucure",
          "name": "Manucure",
          "icon": "hand"
        },
        "yearsExperience": 3,
        "isPrimary": false,
        "createdAt": "2025-12-04T17:00:00Z"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-12-04T17:00:00.000Z",
    "path": "/api/v1/providers/specialties/bulk",
    "method": "POST",
    "duration": 156
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Une seule spécialité peut être marquée comme principale",
  "timestamp": "2025-12-04T17:00:00.000Z",
  "path": "/api/v1/providers/specialties/bulk"
}
```

**Response Error (409):**
```json
{
  "success": false,
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Spécialités déjà existantes: 6, 7",
  "timestamp": "2025-12-04T17:00:00.000Z",
  "path": "/api/v1/providers/specialties/bulk"
}
```

**Note:** Si une erreur survient, **aucune** spécialité n'est créée (transaction atomique).

---

### 4. Update Specialty

**Endpoint:** `PUT /providers/specialties/:id`

**Description:** Mettre à jour une spécialité.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (obligatoire): ID de la spécialité

**Body (JSON) - Tous champs optionnels:**
```json
{
  "yearsExperience": 0,     // OPTIONNEL - Années d'expérience (0-50)
  "isPrimary": false        // OPTIONNEL - Spécialité principale
}
```

**Validation:**
- `yearsExperience`: 0-50
- `isPrimary`: boolean

**Exemple:**
```
PUT /providers/specialties/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category": {
      "id": 6,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "yearsExperience": 10,
    "isPrimary": true,
    "badge": "Expert Certifié"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "SPECIALTY_NOT_FOUND",
    "message": "Spécialité non trouvée"
  }
}
```

---

### 5. Delete Specialty

**Endpoint:** `DELETE /providers/specialties/:id`

**Description:** Supprimer une spécialité (soft delete). La spécialité est marquée comme supprimée mais conservée en base.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id` (obligatoire): ID de la spécialité

**Exemple:**
```
DELETE /providers/specialties/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Spécialité supprimée avec succès"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "SPECIALTY_NOT_FOUND",
    "message": "Spécialité non trouvée"
  }
}
```

---

# 📅 Provider Availability

Gestion flexible des disponibilités par date. Chaque créneau est lié à une date précise.

**Principe:** Le provider définit ses créneaux date par date (pas d'horaires hebdomadaires récurrents).

---

## 1. Create Availability

**Endpoint:** `POST /providers/availability`

**Description:** Créer un créneau de disponibilité pour une date précise. Plusieurs créneaux possibles par date (sans chevauchement).

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2025-12-17",
  "startTime": "09:35",
  "endTime": "11:49",
  "isAvailable": true,
  "reason": "Créneau matin"
}
```

**Validation:**
- `date`: Format YYYY-MM-DD, doit être >= aujourd'hui
- `startTime`, `endTime`: Format HH:mm (ex: "09:35", "11:49")
- `endTime` doit être après `startTime`
- Pas de chevauchement avec les créneaux existants pour la même date
- `isAvailable`: true (disponible) ou false (bloqué), défaut: true

**Exemple - Plusieurs créneaux pour une même date:**
```bash
# Créneau matin
POST { "date": "2025-12-17", "startTime": "09:35", "endTime": "11:49" }

# Créneau après-midi (même date) ✅
POST { "date": "2025-12-17", "startTime": "12:00", "endTime": "17:23" }
```

**Response Success (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2025-12-17",
    "startTime": "09:35",
    "endTime": "11:49",
    "isAvailable": true,
    "reason": "Créneau matin",
    "createdAt": "2024-12-17T10:00:00Z",
    "updatedAt": "2024-12-17T10:00:00Z"
  }
}
```

**Response Error (409 - Chevauchement):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Ce créneau chevauche un créneau existant (09:35-11:49)"
  }
}
```

**Response Error (400 - Date passée):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "La date doit être aujourd'hui ou dans le futur"
  }
}
```

---

## 2. List Availabilities

**Endpoint:** `GET /providers/availability`

**Description:** Récupérer tous les créneaux, avec filtrage optionnel par période.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `startDate` (optionnel): Date début (YYYY-MM-DD)
- `endDate` (optionnel): Date fin (YYYY-MM-DD)

**Exemple:**
```
GET /providers/availability?startDate=2025-12-01&endDate=2025-12-31
```

**Response Success (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-12-17",
      "startTime": "09:35",
      "endTime": "11:49",
      "isAvailable": true,
      "reason": "Créneau matin",
      "createdAt": "2024-12-17T10:00:00Z",
      "updatedAt": "2024-12-17T10:00:00Z"
    },
    {
      "id": 2,
      "date": "2025-12-17",
      "startTime": "12:00",
      "endTime": "17:23",
      "isAvailable": true,
      "reason": null,
      "createdAt": "2024-12-17T10:05:00Z",
      "updatedAt": "2024-12-17T10:05:00Z"
    }
  ]
}
```

---

## 3. Get Availability

**Endpoint:** `GET /providers/availability/:id`

**Description:** Récupérer un créneau par son ID.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id`: ID du créneau

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2025-12-17",
    "startTime": "09:35",
    "endTime": "11:49",
    "isAvailable": true,
    "reason": "Créneau matin",
    "createdAt": "2024-12-17T10:00:00Z",
    "updatedAt": "2024-12-17T10:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Disponibilité non trouvée"
  }
}
```

---

## 4. Update Availability

**Endpoint:** `PUT /providers/availability/:id`

**Description:** Mettre à jour un créneau existant.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Path Parameters:**
- `id`: ID du créneau

**Request Body:**
```json
{
  "startTime": "10:00",
  "endTime": "12:00",
  "isAvailable": false,
  "reason": "Congé maladie"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2025-12-17",
    "startTime": "10:00",
    "endTime": "12:00",
    "isAvailable": false,
    "reason": "Congé maladie",
    "createdAt": "2024-12-17T10:00:00Z",
    "updatedAt": "2024-12-17T11:00:00Z"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Disponibilité non trouvée"
  }
}
```

---

## 5. Delete Availability

**Endpoint:** `DELETE /providers/availability/:id`

**Description:** Supprimer un créneau.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `id`: ID du créneau

**Exemple:**
```
DELETE /providers/availability/1
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "Disponibilité supprimée avec succès"
  }
}
```

**Response Error (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Disponibilité non trouvée"
  }
}
```

---

## 6. Delete Availabilities by Date

**Endpoint:** `DELETE /providers/availability/date/:date`

**Description:** Supprimer tous les créneaux d'une date précise.

**Auth Required:** ✅ Oui (JWT Bearer + Role: provider)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Path Parameters:**
- `date`: Date (YYYY-MM-DD)

**Exemple:**
```
DELETE /providers/availability/date/2025-12-17
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "message": "2 disponibilité(s) supprimée(s)",
    "count": 2
  }
}
```

---

# 🏢 Business Types

## 1. List Business Types

**Endpoint:** `GET /business-types`

**Description:** Récupérer la liste de tous les types de business disponibles pour les providers avec traductions multilingues. Endpoint public (pas d'authentification requise).

**Auth Required:** ❌ Non

**Headers (optionnels):**
```
Accept-Language: fr    // Langue souhaitée (fr, en). Défaut: fr
```

**Query Parameters:** Aucun

**Response Success (200):**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": [
    {
      "id": 1,
      "code": "freelance",
      "label": "A mon compte (freelance)",
      "description": "Je travaille seul(e) a mon compte",
      "icon": "user"
    },
    {
      "id": 2,
      "code": "salon",
      "label": "Gerant d'un salon",
      "description": "Je gere un salon avec des employes",
      "icon": "scissors"
    },
    {
      "id": 3,
      "code": "institut",
      "label": "Gerant d'un institut",
      "description": "Je gere un institut de beaute",
      "icon": "sparkles"
    },
    {
      "id": 4,
      "code": "spa",
      "label": "Gerant d'un spa",
      "description": "Je gere un spa ou centre de bien-etre",
      "icon": "spa"
    },
    {
      "id": 5,
      "code": "coworking",
      "label": "Gerant d'un coworking",
      "description": "Je loue des espaces a d'autres professionnels",
      "icon": "building"
    },
    {
      "id": 6,
      "code": "student",
      "label": "Etudiant",
      "description": "Je suis en formation, tarifs reduits",
      "icon": "graduation-cap"
    },
    {
      "id": 7,
      "code": "employee",
      "label": "Salarie",
      "description": "Je suis salarie(e) d'un etablissement",
      "icon": "briefcase"
    },
    {
      "id": 8,
      "code": "enterprise",
      "label": "Entreprise",
      "description": "Structure B2B pour evenements et marques",
      "icon": "building-2"
    }
  ],
  "meta": {
    "timestamp": "2025-12-05T12:00:00.000Z",
    "path": "/api/v1/business-types",
    "method": "GET",
    "duration": 12
  }
}
```

**Exemple avec Accept-Language: en**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": [
    {
      "id": 1,
      "code": "freelance",
      "label": "Freelance",
      "description": "I work independently on my own",
      "icon": "user"
    },
    {
      "id": 2,
      "code": "salon",
      "label": "Salon Manager",
      "description": "I manage a salon with employees",
      "icon": "scissors"
    }
    // ... autres types en anglais
  ]
}
```

**Notes:**
- Endpoint public accessible sans authentification
- Liste triée par `displayOrder`
- Seuls les types actifs sont retournés
- Le champ `icon` contient le nom d'une icône (ex: Lucide icons)
- Le provider peut choisir son type lors de la mise à jour de son profil
- **Support multilingue:** Utiliser le header `Accept-Language` (fr, en)

---

# 📊 Résumé

## Endpoints par Module

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| **Auth** | 7 | 2/7 |
| **Provider Profile** | 3 | 2/3 |
| **Provider Services** | 7 | 6/7 |
| **Provider Specialties** | 5 | 5/5 |
| **Provider Availability** | 6 | 6/6 |
| **Business Types** | 1 | 0/1 |
| **TOTAL** | **29** | **21/29** |

## Codes d'Erreur Communs

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Identifiants incorrects |
| `UNAUTHORIZED` | 401 | Token manquant ou invalide |
| `FORBIDDEN` | 403 | Accès refusé (rôle insuffisant) |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `CONFLICT` | 409 | Conflit (doublon, etc.) |
| `VALIDATION_ERROR` | 400 | Erreur de validation |
| `TOO_MANY_ATTEMPTS` | 429 | Trop de tentatives |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

## Headers Communs

**Requêtes authentifiées:**
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Réponses:**
```
Content-Type: application/json
Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict
```

## Format de Réponse Standard

**Success:**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": { ... },
  "meta": {
    "timestamp": "2025-12-04T16:00:00.000Z",
    "path": "/api/v1/endpoint",
    "method": "GET",
    "duration": 12
  }
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "code": "ERROR_CODE",
  "message": "Message d'erreur",
  "timestamp": "2025-12-04T16:00:00.000Z",
  "path": "/api/v1/endpoint",
  "details": { ... }  // Optionnel
}
```

---

## 🔒 CORS Configuration

**Développement:**
- Tous les ports localhost autorisés (`http://localhost:*`, `http://127.0.0.1:*`)
- Credentials: `true`

**Production:**
- Liste stricte d'origines autorisées (variable `ALLOWED_ORIGINS`)

**Headers autorisés:**
- `Content-Type`
- `Authorization`
- `X-Requested-With`
- `x-platform`
- `x-request-id`
- `x-client-version`
- `x-device-id`
- `Accept`
- `Accept-Language`

**Headers exposés:**
- `x-request-id`
- `x-response-time`

---

**Documentation générée le:** 2025-12-05

**Dernière mise à jour:** 2025-12-07 - Support multilingue (i18n) pour Business Types et Service Categories

**Version API:** 1.0.0
