# 👤 Client API

Documentation des fonctionnalités pour les utilisateurs **clients** de l'application.

**Base URL:** `http://localhost:4000/api/v1`

---

## 📑 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Parcours Utilisateur](#parcours-utilisateur)
3. [Inscription](#inscription)
   - [Créer un compte client](#créer-un-compte-client)
4. [Recherche Providers](#recherche-providers)
   - [Rechercher des providers](#1-rechercher-des-providers)
   - [Providers populaires](#2-providers-populaires)
   - [Providers à proximité](#3-providers-à-proximité)
   - [Détails d'un provider](#4-détails-dun-provider)
   - [Services d'un provider](#5-services-dun-provider)
   - [Disponibilités d'un provider](#6-disponibilités-dun-provider)
5. [Rendez-vous](#rendez-vous)
   - [Créer un rendez-vous](#1-créer-un-rendez-vous)
   - [Mes rendez-vous](#2-mes-rendez-vous)
   - [Détails d'un rendez-vous](#3-détails-dun-rendez-vous)
   - [Annuler un rendez-vous](#4-annuler-un-rendez-vous)
6. [Références](#références)
   - [Business Types](#business-types)
   - [Catégories de services](#catégories-de-services)
7. [Codes d'erreur](#codes-derreur)

---

## Vue d'ensemble

### Fonctionnalités Client

| Fonctionnalité | Description | Endpoints |
|----------------|-------------|-----------|
| **Inscription** | Créer un compte client | 1 |
| **Recherche Providers** | Trouver et consulter providers | 6 |
| **Rendez-vous** | Réserver, consulter, annuler | 4 |
| **Références** | Business types, catégories | 2 |

**Total: 13 endpoints**

### Authentification

**Endpoints publics (inscription, recherche):** Aucune authentification requise.

**Endpoints authentifiés (rendez-vous):** Token JWT avec rôle `client`.

```http
Authorization: Bearer <accessToken>
```

---

## Parcours Utilisateur

### Inscription et première réservation

```
1. Créer un compte
   └── POST /clients/register (nom, téléphone, mot de passe)

2. Vérifier le téléphone
   └── POST /auth/send-verification-code
   └── POST /auth/verify-phone

3. Se connecter
   └── POST /auth/login

4. Rechercher un provider
   └── GET /search/providers (recherche avec filtres)
   └── GET /search/providers/popular (providers populaires)
   └── GET /search/providers/nearby (par géolocalisation)

5. Consulter le provider
   └── GET /search/providers/:id (détails du provider)
   └── GET /search/providers/:id/services (ses services)

6. Vérifier les disponibilités
   └── GET /search/providers/:id/availability (créneaux libres)

7. Créer le rendez-vous
   └── POST /appointments

8. Suivre le rendez-vous
   └── GET /appointments/my
   └── GET /appointments/:id

9. Annuler si nécessaire (24h avant)
   └── PATCH /appointments/:id/cancel
```

---

## Inscription

### Créer un compte client

Inscription rapide avec informations minimales.

**Endpoint:** `POST /clients/register`

**Auth Required:** ❌ Non

**Rate Limit:** 5 requêtes/minute

#### Request Body

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `firstName` | string | ✅ | Prénom (2-100 caractères) |
| `lastName` | string | ❌ | Nom de famille (optionnel) |
| `phone` | string | ✅ | Téléphone camerounais |
| `password` | string | ✅ | Mot de passe sécurisé |
| `email` | string | ❌ | Email (optionnel) |

#### Formats téléphone acceptés

- `+237655443322`
- `237655443322`
- `00237655443322`
- `655443322`

#### Règles mot de passe

- Minimum 8 caractères
- Au moins 1 majuscule
- Au moins 1 minuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial (!@#$%^&*)

#### Exemple Request

```json
{
  "firstName": "Jean",
  "lastName": "Kamga",
  "phone": "+237655443322",
  "password": "Password123!",
  "email": "jean.kamga@email.com"
}
```

#### Response Success (201)

```json
{
  "success": true,
  "data": {
    "user": {
      "clientId": 1,
      "firstName": "Jean",
      "lastName": "Kamga",
      "phone": "+237655443322",
      "status": "pending_verification"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "message": "Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS."
  }
}
```

#### Response Error (409 - Conflit)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Ce numéro de téléphone est déjà utilisé"
  }
}
```

#### Prochaines étapes après inscription

1. **Vérifier le téléphone:** `POST /auth/send-verification-code`
2. **Valider le code SMS:** `POST /auth/verify-phone`
3. **Se connecter:** `POST /auth/login`

---

## Recherche Providers

Tous les endpoints de recherche sont **publics** (pas d'authentification requise).

### 1. Rechercher des providers

Recherche avec filtres multiples.

**Endpoint:** `GET /search/providers`

**Auth Required:** ❌ Non

#### Query Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `query` | string | ❌ | Recherche textuelle (nom, service) |
| `city` | string | ❌ | Filtrer par ville |
| `neighborhood` | string | ❌ | Filtrer par quartier |
| `categoryId` | number | ❌ | Filtrer par catégorie de service |
| `businessTypeId` | number | ❌ | Filtrer par type de business |
| `minPrice` | number | ❌ | Prix minimum (FCFA) |
| `maxPrice` | number | ❌ | Prix maximum (FCFA) |
| `minRating` | number | ❌ | Note minimum (1-5) |
| `sortBy` | string | ❌ | Tri: `rating`, `popularity`, `newest` |
| `page` | number | ❌ | Page (défaut: 1) |
| `limit` | number | ❌ | Par page (défaut: 10, max: 50) |

#### Exemples de requêtes

```http
# Recherche simple
GET /search/providers?city=Douala

# Recherche avec texte
GET /search/providers?query=tresses&city=Douala

# Filtrer par catégorie et prix
GET /search/providers?categoryId=1&maxPrice=20000

# Tri par popularité
GET /search/providers?sortBy=popularity&limit=20
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "id": 3,
        "businessName": "Salon Marie",
        "bio": "Coiffeuse professionnelle spécialisée en tresses africaines...",
        "city": "Douala",
        "neighborhood": "Akwa",
        "yearsExperience": 10,
        "businessType": {
          "id": 1,
          "code": "salon",
          "label": "Salon de coiffure"
        },
        "statistics": {
          "averageRating": "4.85",
          "totalReviews": 156,
          "totalCompleted": 320
        },
        "specialties": [
          { "id": 1, "name": "Tresses" },
          { "id": 2, "name": "Locks" }
        ],
        "startingPrice": "8000",
        "coordinates": {
          "latitude": "4.0510564",
          "longitude": "9.7678687"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

---

### 2. Providers populaires

Liste des providers les mieux notés.

**Endpoint:** `GET /search/providers/popular`

**Auth Required:** ❌ Non

#### Query Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `city` | string | ❌ | Filtrer par ville |
| `limit` | number | ❌ | Nombre (défaut: 10) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "businessName": "Salon Marie",
      "city": "Douala",
      "neighborhood": "Akwa",
      "businessType": {
        "id": 1,
        "label": "Salon de coiffure"
      },
      "primarySpecialty": {
        "name": "Tresses"
      },
      "statistics": {
        "averageRating": "4.85",
        "totalReviews": 156,
        "totalCompleted": 320
      }
    }
  ]
}
```

---

### 3. Providers à proximité

Recherche par géolocalisation.

**Endpoint:** `GET /search/providers/nearby`

**Auth Required:** ❌ Non

#### Query Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `latitude` | number | ✅ | Latitude GPS |
| `longitude` | number | ✅ | Longitude GPS |
| `radius` | number | ❌ | Rayon en km (défaut: 10) |
| `limit` | number | ❌ | Nombre (défaut: 20) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "businessName": "Salon Marie",
      "city": "Douala",
      "neighborhood": "Akwa",
      "coordinates": {
        "latitude": "4.0510564",
        "longitude": "9.7678687"
      },
      "distance": 1.2,
      "statistics": {
        "averageRating": "4.85",
        "totalReviews": 156
      }
    }
  ]
}
```

---

### 4. Détails d'un provider

Informations complètes d'un provider.

**Endpoint:** `GET /search/providers/:id`

**Auth Required:** ❌ Non

#### Path Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | number | ID du provider |

#### Headers (optionnel)

```http
Accept-Language: fr
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": 3,
    "businessName": "Salon Marie",
    "bio": "Coiffeuse professionnelle avec 10 ans d'expérience, spécialisée en tresses africaines et soins capillaires naturels.",
    "yearsExperience": 10,
    "city": "Douala",
    "neighborhood": "Akwa",
    "address": "123 Rue de la Liberté",
    "coordinates": {
      "latitude": "4.0510564",
      "longitude": "9.7678687"
    },
    "phone": "+237655443322",
    "phoneVerified": true,
    "businessType": {
      "id": 1,
      "code": "salon",
      "label": "Salon de coiffure",
      "description": "Établissement professionnel de coiffure"
    },
    "statistics": {
      "averageRating": "4.85",
      "totalReviews": 156,
      "totalBookings": 342,
      "totalCompleted": 320
    },
    "specialties": [
      {
        "id": 5,
        "categoryId": 1,
        "name": "Tresses",
        "yearsExperience": 10,
        "isPrimary": true
      },
      {
        "id": 6,
        "categoryId": 2,
        "name": "Locks",
        "yearsExperience": 5,
        "isPrimary": false
      }
    ],
    "verification": {
      "phoneVerified": true,
      "identityVerified": true
    },
    "createdAt": "2024-06-15T10:00:00.000Z"
  }
}
```

#### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Provider inexistant ou non validé |

---

### 5. Services d'un provider

Liste des services proposés, groupés par catégorie.

**Endpoint:** `GET /search/providers/:id/services`

**Auth Required:** ❌ Non

#### Path Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | number | ID du provider |

#### Headers (optionnel)

```http
Accept-Language: fr
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "providerId": 3,
    "totalServices": 8,
    "categories": [
      {
        "category": {
          "id": 1,
          "code": "hair_braiding",
          "name": "Tresses"
        },
        "services": [
          {
            "id": 12,
            "name": "Tresses Box Braids",
            "description": "Box braids classiques, toutes longueurs",
            "price": "15000",
            "duration": 180
          },
          {
            "id": 13,
            "name": "Cornrows simples",
            "description": "Tresses collées classiques",
            "price": "8000",
            "duration": 90
          }
        ]
      },
      {
        "category": {
          "id": 2,
          "code": "locks",
          "name": "Locks"
        },
        "services": [
          {
            "id": 14,
            "name": "Entretien Locks",
            "description": "Retwist et soins",
            "price": "10000",
            "duration": 120
          }
        ]
      }
    ]
  }
}
```

---

### 6. Disponibilités d'un provider

Créneaux disponibles pour réservation.

**Endpoint:** `GET /search/providers/:id/availability`

**Auth Required:** ❌ Non

#### Path Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | number | ID du provider |

#### Query Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `startDate` | string | ❌ | Date début (YYYY-MM-DD), défaut: aujourd'hui |
| `endDate` | string | ❌ | Date fin (YYYY-MM-DD), défaut: +7 jours |
| `serviceId` | number | ❌ | ID service pour calculer la durée |

#### Exemples

```http
# Disponibilités des 7 prochains jours
GET /search/providers/3/availability

# Semaine spécifique
GET /search/providers/3/availability?startDate=2025-01-20&endDate=2025-01-26

# Avec durée du service
GET /search/providers/3/availability?serviceId=12
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "providerId": 3,
    "serviceDuration": 180,
    "period": {
      "startDate": "2025-01-15",
      "endDate": "2025-01-22"
    },
    "availability": [
      {
        "date": "2025-01-15",
        "slots": [
          { "startTime": "09:00", "endTime": "12:00" },
          { "startTime": "14:00", "endTime": "18:00" }
        ],
        "slotsCount": 2
      },
      {
        "date": "2025-01-16",
        "slots": [
          { "startTime": "10:00", "endTime": "13:00" }
        ],
        "slotsCount": 1
      },
      {
        "date": "2025-01-17",
        "slots": [],
        "slotsCount": 0
      }
    ]
  }
}
```

#### Notes

- Les créneaux déjà réservés sont automatiquement exclus
- Si `serviceId` est fourni, `serviceDuration` correspond à la durée du service
- Les dates sans disponibilité ont un tableau `slots` vide

---

## Rendez-vous

### 1. Créer un rendez-vous

Réserve un créneau chez un provider pour un service.

**Endpoint:** `POST /appointments`

**Auth Required:** ✅ Oui (Role: `client`)

#### Headers

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

#### Request

```json
{
  "providerId": 3,
  "serviceId": 12,
  "scheduledAt": "2025-01-20T10:00:00.000Z",
  "notes": "Première visite, cheveux longs"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `providerId` | number | ✅ | ID du provider |
| `serviceId` | number | ✅ | ID du service |
| `scheduledAt` | string | ✅ | Date/heure ISO 8601 (futur) |
| `notes` | string | ❌ | Notes pour le provider (max 500 car.) |

#### Validation

- `scheduledAt` doit être dans le futur
- Le provider doit être disponible sur ce créneau
- Le service doit appartenir au provider
- Pas de chevauchement avec d'autres RDV

#### Response Success (201)

```json
{
  "success": true,
  "message": "Rendez-vous créé avec succès",
  "data": {
    "id": 45,
    "providerId": 3,
    "serviceId": 12,
    "scheduledAt": "2025-01-20T10:00:00.000Z",
    "endAt": "2025-01-20T13:00:00.000Z",
    "durationMinutes": 180,
    "status": "pending",
    "priceFcfa": 15000,
    "service": {
      "id": 12,
      "name": "Tresses Box Braids",
      "price": "15000"
    },
    "provider": {
      "id": 3,
      "businessName": "Salon Marie",
      "phone": "+237655443322"
    },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

#### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `PROVIDER_NOT_FOUND` | 404 | Provider inexistant |
| `SERVICE_NOT_FOUND` | 404 | Service inexistant |
| `SLOT_NOT_AVAILABLE` | 409 | Créneau non disponible |
| `PAST_DATE` | 400 | Date dans le passé |
| `VALIDATION_ERROR` | 400 | Données invalides |

#### Exemple cURL

```bash
curl -X POST http://localhost:4000/api/v1/appointments \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 3,
    "serviceId": 12,
    "scheduledAt": "2025-01-20T10:00:00.000Z"
  }'
```

---

### 2. Mes rendez-vous

Liste les rendez-vous du client connecté avec filtres et pagination.

**Endpoint:** `GET /appointments/my`

**Auth Required:** ✅ Oui (Role: `client`)

#### Headers

```http
Authorization: Bearer <accessToken>
```

#### Query Parameters

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `status` | string | ❌ | Filtrer par statut |
| `startDate` | string | ❌ | Date début (YYYY-MM-DD) |
| `endDate` | string | ❌ | Date fin (YYYY-MM-DD) |
| `page` | number | ❌ | Page (défaut: 1) |
| `limit` | number | ❌ | Par page (défaut: 10, max: 50) |

#### Statuts disponibles

| Statut | Description |
|--------|-------------|
| `pending` | En attente de confirmation |
| `confirmed` | Confirmé par le provider |
| `in_progress` | En cours |
| `completed` | Terminé |
| `cancelled` | Annulé |
| `no_show` | Client absent |

#### Exemples de requêtes

```http
# Tous mes RDV
GET /appointments/my

# RDV en attente
GET /appointments/my?status=pending

# RDV du mois de janvier
GET /appointments/my?startDate=2025-01-01&endDate=2025-01-31

# Page 2, 20 résultats
GET /appointments/my?page=2&limit=20
```

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "scheduledAt": "2025-01-20T10:00:00.000Z",
      "endAt": "2025-01-20T13:00:00.000Z",
      "status": "confirmed",
      "durationMinutes": 180,
      "priceFcfa": 15000,
      "service": {
        "id": 12,
        "name": "Tresses Box Braids"
      },
      "provider": {
        "id": 3,
        "businessName": "Salon Marie",
        "phone": "+237655443322",
        "city": "Douala"
      }
    },
    {
      "id": 42,
      "scheduledAt": "2025-01-18T14:00:00.000Z",
      "endAt": "2025-01-18T15:00:00.000Z",
      "status": "completed",
      "durationMinutes": 60,
      "priceFcfa": 8000,
      "service": {
        "id": 15,
        "name": "Manucure Gel"
      },
      "provider": {
        "id": 5,
        "businessName": "Beauty Nails",
        "phone": "+237699887766",
        "city": "Douala"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 12,
      "totalPages": 2
    }
  }
}
```

---

### 3. Détails d'un rendez-vous

Récupère les détails complets d'un rendez-vous.

**Endpoint:** `GET /appointments/:id`

**Auth Required:** ✅ Oui (Role: `client` ou `provider`)

#### Headers

```http
Authorization: Bearer <accessToken>
```

#### Path Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | number | ID du rendez-vous |

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": 45,
    "scheduledAt": "2025-01-20T10:00:00.000Z",
    "endAt": "2025-01-20T13:00:00.000Z",
    "status": "confirmed",
    "durationMinutes": 180,
    "priceFcfa": 15000,
    "depositFcfa": 0,
    "notes": "Première visite, cheveux longs",
    "service": {
      "id": 12,
      "name": "Tresses Box Braids",
      "description": "Box braids classiques, toutes longueurs",
      "price": "15000",
      "duration": 180
    },
    "provider": {
      "id": 3,
      "businessName": "Salon Marie",
      "phone": "+237655443322",
      "city": "Douala",
      "neighborhood": "Akwa",
      "address": "123 Rue de la Liberté"
    },
    "confirmation": {
      "confirmedAt": "2025-01-15T12:00:00.000Z"
    },
    "cancellation": null,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

#### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | RDV inexistant |
| `FORBIDDEN` | 403 | Pas votre RDV |

---

### 4. Annuler un rendez-vous

Annule un rendez-vous (minimum 24h avant).

**Endpoint:** `PATCH /appointments/:id/cancel`

**Auth Required:** ✅ Oui (Role: `client`)

#### Headers

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

#### Path Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `id` | number | ID du rendez-vous |

#### Request

```json
{
  "reason": "Empêchement personnel"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `reason` | string | ❌ | Motif d'annulation (max 500 car.) |

#### Règles d'annulation

- ✅ Annulation possible si statut `pending` ou `confirmed`
- ✅ Minimum **24 heures** avant le RDV
- ❌ Impossible si `in_progress`, `completed`, `cancelled`
- ❌ Impossible si moins de 24h avant

#### Response Success (200)

```json
{
  "success": true,
  "message": "Rendez-vous annulé avec succès",
  "data": {
    "id": 45,
    "status": "cancelled",
    "cancellation": {
      "cancelledAt": "2025-01-18T10:00:00.000Z",
      "cancellationReason": "Empêchement personnel",
      "cancellationType": "client"
    }
  }
}
```

#### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | RDV inexistant |
| `FORBIDDEN` | 403 | Pas votre RDV |
| `INVALID_STATUS` | 400 | Statut non annulable |
| `TOO_LATE` | 400 | Moins de 24h avant le RDV |

#### Exemple cURL

```bash
curl -X PATCH http://localhost:4000/api/v1/appointments/45/cancel \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Empêchement personnel"}'
```

---

## Recherche

### Business Types

Liste les types de business disponibles (salons, freelance, etc.).

**Endpoint:** `GET /business-types`

**Auth Required:** ❌ Non

**Documentation complète:** [COMMON.md](./COMMON.md#business-types)

#### Headers (optionnel)

```http
Accept-Language: fr
```

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "salon",
      "label": "Salon de coiffure",
      "description": "Établissement professionnel de coiffure",
      "icon": "store"
    },
    {
      "id": 2,
      "code": "freelance",
      "label": "Coiffeuse indépendante",
      "description": "Prestataire à domicile ou en déplacement",
      "icon": "user"
    }
  ]
}
```

---

### Catégories de services

Liste les catégories de services disponibles.

**Endpoint:** `GET /providers/services/categories/list`

**Auth Required:** ❌ Non

#### Headers (optionnel)

```http
Accept-Language: fr
```

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "hair_braiding",
      "name": "Tresses",
      "description": "Tous types de tresses africaines",
      "icon": "scissors",
      "children": [
        {
          "id": 10,
          "code": "box_braids",
          "name": "Box Braids"
        },
        {
          "id": 11,
          "code": "cornrows",
          "name": "Cornrows"
        }
      ]
    },
    {
      "id": 2,
      "code": "nails",
      "name": "Ongles",
      "description": "Manucure et pédicure",
      "icon": "hand"
    }
  ]
}
```

---

## Codes d'erreur

### Erreurs spécifiques Client

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `PROVIDER_NOT_FOUND` | 404 | Provider inexistant | Vérifier l'ID |
| `SERVICE_NOT_FOUND` | 404 | Service inexistant | Vérifier l'ID |
| `SLOT_NOT_AVAILABLE` | 409 | Créneau indisponible | Choisir autre créneau |
| `PAST_DATE` | 400 | Date dans le passé | Choisir date future |
| `TOO_LATE` | 400 | Annulation tardive | Contact provider |
| `INVALID_STATUS` | 400 | Action impossible | Vérifier statut RDV |

### Erreurs communes

Voir [COMMON.md](./COMMON.md#codes-derreur) pour la liste complète.

---

## 📊 Résumé des Endpoints

### Recherche Providers (6 endpoints - publics)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/search/providers` | GET | Rechercher avec filtres |
| `/search/providers/popular` | GET | Providers populaires |
| `/search/providers/nearby` | GET | Providers à proximité |
| `/search/providers/:id` | GET | Détails d'un provider |
| `/search/providers/:id/services` | GET | Services d'un provider |
| `/search/providers/:id/availability` | GET | Disponibilités |

### Rendez-vous (4 endpoints - authentifiés)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/appointments` | POST | ✅ client | Créer un RDV |
| `/appointments/my` | GET | ✅ client | Lister mes RDV |
| `/appointments/:id` | GET | ✅ client/provider | Détails d'un RDV |
| `/appointments/:id/cancel` | PATCH | ✅ client | Annuler un RDV |

### Références (2 endpoints - publics)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/business-types` | GET | Types de business |
| `/providers/services/categories/list` | GET | Catégories de services |

**Total: 12 endpoints (6 publics, 4 authentifiés client, 2 références)**

---

## 🔜 Fonctionnalités à venir

- [ ] Système de favoris
- [ ] Historique et avis
- [ ] Notifications push

---

**Voir aussi:**
- [README.md](./README.md) - Index principal
- [AUTH.md](./AUTH.md) - Authentification
- [COMMON.md](./COMMON.md) - Références communes
