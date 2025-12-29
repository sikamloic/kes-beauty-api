# 💼 Provider API

Documentation des fonctionnalités pour les **prestataires de services** (providers).

**Base URL:** `http://localhost:4000/api/v1`

---

## 📑 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Parcours Provider](#parcours-provider)
3. [Inscription](#inscription)
4. [Profil](#profil)
   - [Consulter mon profil](#1-consulter-mon-profil)
   - [Mettre à jour mon profil](#2-mettre-à-jour-mon-profil)
   - [Taux de complétion](#3-taux-de-complétion)
5. [Services](#services)
   - [Créer un service](#1-créer-un-service)
   - [Lister mes services](#2-lister-mes-services)
   - [Modifier un service](#3-modifier-un-service)
   - [Supprimer un service](#4-supprimer-un-service)
   - [Services populaires](#5-services-populaires)
   - [Catégories de services](#6-catégories-de-services)
6. [Spécialités](#spécialités)
   - [Ajouter une spécialité](#1-ajouter-une-spécialité)
   - [Ajouter plusieurs spécialités](#2-ajouter-plusieurs-spécialités)
   - [Lister mes spécialités](#3-lister-mes-spécialités)
   - [Modifier une spécialité](#4-modifier-une-spécialité)
   - [Supprimer une spécialité](#5-supprimer-une-spécialité)
7. [Disponibilités](#disponibilités)
   - [Créer des créneaux](#1-créer-des-créneaux)
   - [Lister mes disponibilités](#2-lister-mes-disponibilités)
   - [Modifier un créneau](#3-modifier-un-créneau)
   - [Supprimer un créneau](#4-supprimer-un-créneau)
   - [Bloquer une période](#5-bloquer-une-période)
   - [Supprimer plusieurs créneaux](#6-supprimer-plusieurs-créneaux)
8. [Gestion des Rendez-vous](#gestion-des-rendez-vous)
   - [Lister les RDV](#1-lister-les-rdv-provider)
   - [Détails d'un RDV](#2-détails-dun-rdv)
   - [Changer le statut](#3-changer-le-statut)
9. [Dashboard](#dashboard)
   - [Résumé](#1-résumé-dashboard)
   - [Statistiques](#2-statistiques)
   - [Revenus](#3-revenus)
   - [Stats RDV](#4-stats-rdv)
   - [Prochains RDV](#5-prochains-rdv)
   - [Top Services](#6-top-services)
   - [RDV du jour](#7-rdv-du-jour)

---

## Vue d'ensemble

### Fonctionnalités Provider

| Module | Description | Endpoints |
|--------|-------------|-----------|
| **Profil** | Gestion du profil business | 3 |
| **Services** | Catalogue de prestations | 7 |
| **Spécialités** | Domaines d'expertise | 5 |
| **Disponibilités** | Gestion des créneaux | 6 |
| **Rendez-vous** | Gestion des réservations | 3 |
| **Dashboard** | Statistiques et suivi | 7 |

**Total: 31 endpoints**

### Authentification

Tous les endpoints provider nécessitent un token JWT avec le rôle `provider`.

```http
Authorization: Bearer <accessToken>
```

---

## Parcours Provider

### Onboarding

```
1. Inscription
   └── POST /providers/register

2. Connexion
   └── POST /auth/login

3. Vérification téléphone
   └── POST /auth/send-verification-code
   └── POST /auth/verify-phone

4. Compléter le profil
   └── PATCH /providers/profile

5. Ajouter des spécialités
   └── POST /providers/specialties/bulk

6. Créer des services
   └── POST /providers/services

7. Définir les disponibilités
   └── POST /providers/availability
```

### Gestion quotidienne

```
1. Consulter le dashboard
   └── GET /providers/dashboard/summary

2. Gérer les RDV du jour
   └── GET /providers/dashboard/today
   └── PATCH /appointments/:id/status

3. Suivre les revenus
   └── GET /providers/dashboard/revenue
```

---

## Inscription

Crée un nouveau compte provider.

**Endpoint:** `POST /providers/register`

**Auth Required:** ❌ Non

### Request

```json
{
  "fullName": "Marie Dupont",
  "phone": "+237655443322",
  "password": "Password123!",
  "city": "Douala"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `fullName` | string | ✅ | Nom complet (2-100 car.) |
| `phone` | string | ✅ | Téléphone Cameroun (+237...) |
| `password` | string | ✅ | Mot de passe fort |
| `city` | string | ✅ | Ville (voir liste) |

### Villes disponibles

- `Douala`
- `Yaoundé`
- `Bafoussam`
- `Garoua`
- `Bamenda`

### Validation mot de passe

- Minimum 8 caractères
- Au moins 1 majuscule (A-Z)
- Au moins 1 minuscule (a-z)
- Au moins 1 chiffre (0-9)
- Au moins 1 caractère spécial (@$!%*?&)

### Response Success (201)

```json
{
  "success": true,
  "message": "Inscription réussie",
  "data": {
    "user": {
      "phone": "+237655443322",
      "role": "provider",
      "providerId": 3
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `PHONE_EXISTS` | 409 | Téléphone déjà utilisé |
| `VALIDATION_ERROR` | 400 | Données invalides |

---

## Profil

### 1. Consulter mon profil

**Endpoint:** `GET /providers/profile`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "id": 3,
    "userId": 5,
    "businessName": "Salon Marie",
    "bio": "Coiffeuse professionnelle avec 10 ans d'expérience",
    "yearsExperience": 10,
    "city": "Douala",
    "neighborhood": "Akwa",
    "address": "123 Rue de la Liberté",
    "latitude": "4.0510564",
    "longitude": "9.7678687",
    "businessType": {
      "id": 1,
      "code": "salon",
      "label": "Salon de coiffure"
    },
    "user": {
      "phone": "+237655443322",
      "email": "marie@example.com",
      "phoneVerifiedAt": "2025-01-10T10:00:00.000Z"
    },
    "statistics": {
      "averageRating": "4.85",
      "totalReviews": 156,
      "totalBookings": 342
    },
    "createdAt": "2025-01-01T10:00:00.000Z"
  }
}
```

---

### 2. Mettre à jour mon profil

**Endpoint:** `PATCH /providers/profile`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "businessName": "Salon Marie Beauté",
  "bio": "Spécialiste tresses africaines et soins capillaires",
  "yearsExperience": 12,
  "neighborhood": "Bonanjo",
  "address": "456 Avenue de la Paix",
  "businessTypeId": 1,
  "latitude": 4.0510564,
  "longitude": 9.7678687
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `businessName` | string | ❌ | Nom du business (max 255) |
| `bio` | string | ❌ | Description (max 1000) |
| `yearsExperience` | number | ❌ | Années d'expérience |
| `neighborhood` | string | ❌ | Quartier (max 100) |
| `address` | string | ❌ | Adresse complète |
| `businessTypeId` | number | ❌ | Type de business |
| `latitude` | number | ❌ | Latitude GPS |
| `longitude` | number | ❌ | Longitude GPS |

#### Response Success (200)

```json
{
  "success": true,
  "message": "Profil mis à jour",
  "data": {
    "id": 3,
    "businessName": "Salon Marie Beauté",
    "bio": "Spécialiste tresses africaines et soins capillaires",
    "yearsExperience": 12,
    "neighborhood": "Bonanjo",
    "address": "456 Avenue de la Paix"
  }
}
```

---

### 3. Taux de complétion

Permet au provider de connaître son taux de complétion de profil et les étapes restantes pour être pleinement opérationnel.

**Endpoint:** `GET /providers/profile/completion`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "percentage": 65,
    "status": "basic",
    "canReceiveBookings": false,
    "isVisible": false,
    "criteria": [
      {
        "key": "business_name",
        "label": "Nom du business",
        "description": "Nom de votre salon ou activité",
        "weight": 10,
        "isCompleted": true,
        "isRequired": true,
        "category": "basic"
      },
      {
        "key": "phone_verified",
        "label": "Téléphone vérifié",
        "description": "Vérification du numéro de téléphone par SMS",
        "weight": 15,
        "isCompleted": true,
        "isRequired": true,
        "category": "verification"
      },
      {
        "key": "has_services",
        "label": "Services créés",
        "description": "Au moins un service actif avec prix et durée",
        "weight": 15,
        "isCompleted": false,
        "isRequired": true,
        "category": "services"
      }
    ],
    "nextSteps": [
      "🔴 Services créés: Au moins un service actif avec prix et durée",
      "🔴 Disponibilités définies: Créneaux horaires disponibles pour les réservations",
      "🔴 Compte approuvé: Validation de votre compte par notre équipe",
      "🟡 Biographie: Description de votre activité et expertise",
      "🟡 Géolocalisation: Coordonnées GPS pour la recherche par proximité"
    ],
    "summary": {
      "completed": 8,
      "total": 16,
      "requiredCompleted": 3,
      "requiredTotal": 6
    }
  }
}
```

#### Critères de complétion

| Catégorie | Critères | Poids total |
|-----------|----------|-------------|
| **basic** | Nom, ville, type, bio, quartier, adresse, géoloc, expérience | 48% |
| **verification** | Téléphone vérifié, compte approuvé, pièce d'identité | 35% |
| **services** | Services créés, disponibilités, spécialités | 30% |
| **visibility** | Email, portfolio | 7% |

#### Statuts

| Status | Pourcentage | Description |
|--------|-------------|-------------|
| `incomplete` | < 50% | Profil incomplet, actions requises |
| `basic` | 50-69% | Profil basique, améliorations possibles |
| `good` | 70-89% | Bon profil, quelques optimisations |
| `excellent` | ≥ 90% | Profil complet et optimisé |

#### Conditions pour recevoir des réservations

Pour `canReceiveBookings: true`, tous les critères **requis** doivent être complétés :
- ✅ Nom du business
- ✅ Ville
- ✅ Téléphone vérifié
- ✅ Compte approuvé
- ✅ Au moins 1 service actif
- ✅ Disponibilités définies

---

## Services

### 1. Créer un service

**Endpoint:** `POST /providers/services`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "categoryId": 10,
  "name": "Tresses Box Braids",
  "description": "Box braids classiques, toutes longueurs disponibles",
  "price": 15000,
  "duration": 180
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `categoryId` | number | ✅ | ID catégorie |
| `name` | string | ✅ | Nom du service (max 255) |
| `description` | string | ❌ | Description détaillée |
| `price` | number | ✅ | Prix en FCFA (min 100) |
| `duration` | number | ✅ | Durée en minutes (min 15) |

#### Response Success (201)

```json
{
  "success": true,
  "message": "Service créé",
  "data": {
    "id": 12,
    "name": "Tresses Box Braids",
    "description": "Box braids classiques, toutes longueurs disponibles",
    "price": "15000",
    "duration": 180,
    "isActive": true,
    "category": {
      "id": 10,
      "code": "box_braids",
      "name": "Box Braids"
    },
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 2. Lister mes services

**Endpoint:** `GET /providers/services`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `categoryId` | number | Filtrer par catégorie |
| `isActive` | boolean | Filtrer par statut |
| `page` | number | Page (défaut: 1) |
| `limit` | number | Par page (défaut: 10) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "name": "Tresses Box Braids",
      "price": "15000",
      "duration": 180,
      "isActive": true,
      "category": {
        "id": 10,
        "name": "Box Braids"
      }
    },
    {
      "id": 13,
      "name": "Cornrows simples",
      "price": "8000",
      "duration": 90,
      "isActive": true,
      "category": {
        "id": 11,
        "name": "Cornrows"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    }
  }
}
```

---

### 3. Modifier un service

**Endpoint:** `PATCH /providers/services/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "name": "Tresses Box Braids Premium",
  "price": 18000,
  "isActive": true
}
```

#### Response Success (200)

```json
{
  "success": true,
  "message": "Service mis à jour",
  "data": {
    "id": 12,
    "name": "Tresses Box Braids Premium",
    "price": "18000",
    "isActive": true
  }
}
```

---

### 4. Supprimer un service

**Endpoint:** `DELETE /providers/services/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "message": "Service supprimé"
}
```

**Note:** Suppression logique (soft delete). Le service n'apparaît plus mais l'historique des RDV est conservé.

---

### 5. Services populaires

Liste les services les plus réservés (tous providers).

**Endpoint:** `GET /providers/services/popular`

**Auth Required:** ❌ Non

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `categoryId` | number | Filtrer par catégorie |
| `city` | string | Filtrer par ville |
| `limit` | number | Nombre (défaut: 10) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "name": "Tresses Box Braids",
      "price": "15000",
      "duration": 180,
      "bookingsCount": 156,
      "provider": {
        "id": 3,
        "businessName": "Salon Marie",
        "city": "Douala"
      }
    }
  ]
}
```

---

### 6. Catégories de services

**Endpoint:** `GET /providers/services/categories/list`

**Auth Required:** ❌ Non

**Documentation:** Voir [CLIENT.md](./CLIENT.md#catégories-de-services)

---

## Spécialités

### 1. Ajouter une spécialité

**Endpoint:** `POST /providers/specialties`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "categoryId": 1,
  "yearsExperience": 8,
  "isPrimary": true
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `categoryId` | number | ✅ | ID catégorie |
| `yearsExperience` | number | ❌ | Années d'expérience (défaut: 0) |
| `isPrimary` | boolean | ❌ | Spécialité principale (défaut: false) |

#### Response Success (201)

```json
{
  "success": true,
  "message": "Spécialité ajoutée",
  "data": {
    "id": 5,
    "categoryId": 1,
    "yearsExperience": 8,
    "isPrimary": true,
    "badge": "expert",
    "category": {
      "id": 1,
      "name": "Tresses"
    }
  }
}
```

#### Badges automatiques

| Badge | Condition |
|-------|-----------|
| `beginner` | 0-2 ans |
| `intermediate` | 3-5 ans |
| `advanced` | 6-9 ans |
| `expert` | 10+ ans |

---

### 2. Ajouter plusieurs spécialités

**Endpoint:** `POST /providers/specialties/bulk`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "specialties": [
    { "categoryId": 1, "yearsExperience": 8, "isPrimary": true },
    { "categoryId": 2, "yearsExperience": 5 },
    { "categoryId": 3, "yearsExperience": 3 }
  ]
}
```

#### Response Success (201)

```json
{
  "success": true,
  "message": "3 spécialité(s) ajoutée(s)",
  "data": {
    "added": 3,
    "specialties": [...]
  }
}
```

---

### 3. Lister mes spécialités

**Endpoint:** `GET /providers/specialties`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "yearsExperience": 8,
      "isPrimary": true,
      "badge": "expert",
      "category": {
        "id": 1,
        "code": "hair_braiding",
        "name": "Tresses"
      }
    },
    {
      "id": 6,
      "yearsExperience": 5,
      "isPrimary": false,
      "badge": "intermediate",
      "category": {
        "id": 2,
        "code": "nails",
        "name": "Ongles"
      }
    }
  ]
}
```

---

### 4. Modifier une spécialité

**Endpoint:** `PATCH /providers/specialties/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "yearsExperience": 10,
  "isPrimary": true
}
```

---

### 5. Supprimer une spécialité

**Endpoint:** `DELETE /providers/specialties/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

**Note:** Impossible de supprimer la spécialité principale si c'est la seule.

---

## Disponibilités

### 1. Créer des créneaux

**Endpoint:** `POST /providers/availability`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "slots": [
    {
      "date": "2025-01-20",
      "startTime": "09:00",
      "endTime": "12:00"
    },
    {
      "date": "2025-01-20",
      "startTime": "14:00",
      "endTime": "18:00"
    }
  ]
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `slots` | array | ✅ | Liste des créneaux |
| `slots[].date` | string | ✅ | Date (YYYY-MM-DD) |
| `slots[].startTime` | string | ✅ | Heure début (HH:mm) |
| `slots[].endTime` | string | ✅ | Heure fin (HH:mm) |

#### Validation

- Date doit être future ou aujourd'hui
- `startTime` < `endTime`
- Pas de chevauchement avec créneaux existants
- Format 24h (00:00 - 23:59)

#### Response Success (201)

```json
{
  "success": true,
  "message": "2 créneau(x) créé(s)",
  "data": {
    "created": 2,
    "slots": [
      {
        "id": 15,
        "date": "2025-01-20",
        "startTime": "09:00:00",
        "endTime": "12:00:00",
        "isAvailable": true
      },
      {
        "id": 16,
        "date": "2025-01-20",
        "startTime": "14:00:00",
        "endTime": "18:00:00",
        "isAvailable": true
      }
    ]
  }
}
```

---

### 2. Lister mes disponibilités

**Endpoint:** `GET /providers/availability`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `startDate` | string | Date début (YYYY-MM-DD) |
| `endDate` | string | Date fin (YYYY-MM-DD) |
| `isAvailable` | boolean | Filtrer disponibles/bloqués |

#### Exemples

```http
# Disponibilités de la semaine
GET /providers/availability?startDate=2025-01-20&endDate=2025-01-26

# Créneaux bloqués uniquement
GET /providers/availability?isAvailable=false
```

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "date": "2025-01-20",
      "startTime": "09:00:00",
      "endTime": "12:00:00",
      "isAvailable": true,
      "reason": null
    },
    {
      "id": 16,
      "date": "2025-01-20",
      "startTime": "14:00:00",
      "endTime": "18:00:00",
      "isAvailable": true,
      "reason": null
    }
  ]
}
```

---

### 3. Modifier un créneau

**Endpoint:** `PATCH /providers/availability/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "startTime": "10:00",
  "endTime": "13:00"
}
```

---

### 4. Supprimer un créneau

**Endpoint:** `DELETE /providers/availability/:id`

**Auth Required:** ✅ Oui (Role: `provider`)

---

### 5. Bloquer une période

Marque une période comme indisponible (congés, formation, etc.).

**Endpoint:** `POST /providers/availability/block`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "date": "2025-01-25",
  "startTime": "09:00",
  "endTime": "18:00",
  "reason": "Formation professionnelle"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `date` | string | ✅ | Date (YYYY-MM-DD) |
| `startTime` | string | ✅ | Heure début |
| `endTime` | string | ✅ | Heure fin |
| `reason` | string | ❌ | Motif (max 255) |

#### Response Success (201)

```json
{
  "success": true,
  "message": "Période bloquée",
  "data": {
    "id": 20,
    "date": "2025-01-25",
    "startTime": "09:00:00",
    "endTime": "18:00:00",
    "isAvailable": false,
    "reason": "Formation professionnelle"
  }
}
```

---

### 6. Supprimer plusieurs créneaux

**Endpoint:** `DELETE /providers/availability/bulk`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "ids": [15, 16, 17]
}
```

#### Response Success (200)

```json
{
  "success": true,
  "message": "3 créneau(x) supprimé(s)",
  "data": {
    "deleted": 3
  }
}
```

---

## Gestion des Rendez-vous

### 1. Lister les RDV (Provider)

**Endpoint:** `GET /appointments/provider`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `status` | string | Filtrer par statut |
| `startDate` | string | Date début |
| `endDate` | string | Date fin |
| `page` | number | Page |
| `limit` | number | Par page |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "scheduledAt": "2025-01-20T10:00:00.000Z",
      "status": "pending",
      "durationMinutes": 180,
      "priceFcfa": 15000,
      "service": {
        "id": 12,
        "name": "Tresses Box Braids"
      },
      "client": {
        "phone": "+237699887766"
      }
    }
  ],
  "meta": {
    "pagination": {...}
  }
}
```

---

### 2. Détails d'un RDV

**Endpoint:** `GET /appointments/:id`

**Auth Required:** ✅ Oui (Role: `provider` ou `client`)

**Documentation:** Voir [CLIENT.md](./CLIENT.md#3-détails-dun-rendez-vous)

---

### 3. Changer le statut

**Endpoint:** `PATCH /appointments/:id/status`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Request

```json
{
  "status": "confirmed"
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `status` | string | ✅ | Nouveau statut |

#### Transitions autorisées

| De | Vers | Description |
|----|------|-------------|
| `pending` | `confirmed` | Confirmer le RDV |
| `pending` | `cancelled` | Refuser le RDV |
| `confirmed` | `in_progress` | Démarrer la prestation |
| `confirmed` | `cancelled` | Annuler |
| `in_progress` | `completed` | Terminer |
| `confirmed` | `no_show` | Client absent |

#### Response Success (200)

```json
{
  "success": true,
  "message": "Statut mis à jour",
  "data": {
    "id": 45,
    "status": "confirmed",
    "confirmation": {
      "confirmedAt": "2025-01-15T12:00:00.000Z"
    }
  }
}
```

#### Response Errors

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_TRANSITION` | 400 | Transition non autorisée |
| `NOT_FOUND` | 404 | RDV inexistant |
| `FORBIDDEN` | 403 | Pas votre RDV |

---

## Dashboard

### 1. Résumé Dashboard

Vue d'ensemble complète pour la page d'accueil.

**Endpoint:** `GET /providers/dashboard/summary`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "statistics": {
      "averageRating": "4.85",
      "totalReviews": 156,
      "totalBookings": 342,
      "totalCompleted": 320,
      "totalCancelled": 12,
      "completionRate": 94
    },
    "today": {
      "appointments": [...],
      "count": 3
    },
    "pendingCount": 5
  }
}
```

---

### 2. Statistiques

**Endpoint:** `GET /providers/dashboard/statistics`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "averageRating": "4.85",
    "totalReviews": 156,
    "totalBookings": 342,
    "totalCompleted": 320,
    "totalCancelled": 12,
    "completionRate": 94
  }
}
```

---

### 3. Revenus

**Endpoint:** `GET /providers/dashboard/revenue`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `period` | string | `today`, `week`, `month`, `year`, `custom` |
| `startDate` | string | Pour période custom |
| `endDate` | string | Pour période custom |

#### Exemples

```http
GET /providers/dashboard/revenue
GET /providers/dashboard/revenue?period=week
GET /providers/dashboard/revenue?period=custom&startDate=2025-01-01&endDate=2025-01-31
```

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "totalRevenue": 450000,
    "appointmentsCount": 32,
    "averagePerAppointment": 14063,
    "period": {
      "startDate": "2024-12-15",
      "endDate": "2025-01-15"
    },
    "chart": [
      { "date": "2025-01-10", "revenue": 45000, "count": 3 },
      { "date": "2025-01-11", "revenue": 30000, "count": 2 },
      { "date": "2025-01-12", "revenue": 0, "count": 0 }
    ]
  }
}
```

---

### 4. Stats RDV

**Endpoint:** `GET /providers/dashboard/appointments`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

Mêmes paramètres que [Revenus](#3-revenus).

#### Response Success (200)

```json
{
  "success": true,
  "data": {
    "total": 45,
    "byStatus": {
      "pending": 5,
      "confirmed": 8,
      "in_progress": 2,
      "completed": 28,
      "cancelled": 2,
      "no_show": 0
    },
    "period": {
      "startDate": "2024-12-15",
      "endDate": "2025-01-15"
    }
  }
}
```

---

### 5. Prochains RDV

**Endpoint:** `GET /providers/dashboard/upcoming`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `limit` | number | Nombre de RDV (défaut: 5) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "scheduledAt": "2025-01-15T10:00:00.000Z",
      "status": "confirmed",
      "durationMinutes": 180,
      "priceFcfa": 15000,
      "service": {
        "id": 1,
        "name": "Tresses Box Braids"
      },
      "clientPhone": "+237655443322"
    }
  ]
}
```

---

### 6. Top Services

**Endpoint:** `GET /providers/dashboard/top-services`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Query Parameters

| Paramètre | Type | Description |
|-----------|------|-------------|
| `period` | string | Période de calcul |
| `limit` | number | Nombre de services (défaut: 5) |

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "serviceId": 1,
      "name": "Tresses Box Braids",
      "price": "15000",
      "bookingsCount": 45,
      "totalRevenue": 675000
    },
    {
      "serviceId": 3,
      "name": "Manucure Gel",
      "price": "8000",
      "bookingsCount": 32,
      "totalRevenue": 256000
    }
  ]
}
```

---

### 7. RDV du jour

**Endpoint:** `GET /providers/dashboard/today`

**Auth Required:** ✅ Oui (Role: `provider`)

#### Response Success (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "scheduledAt": "2025-01-15T10:00:00.000Z",
      "status": "confirmed",
      "durationMinutes": 180,
      "priceFcfa": 15000,
      "service": {
        "id": 1,
        "name": "Tresses Box Braids"
      },
      "clientPhone": "+237655443322"
    }
  ]
}
```

---

## 📊 Résumé des Endpoints

### Profil (2)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/providers/profile` | GET | Mon profil |
| `/providers/profile` | PATCH | Modifier profil |

### Services (7)

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/providers/services` | POST | ✅ | Créer service |
| `/providers/services` | GET | ✅ | Lister services |
| `/providers/services/:id` | PATCH | ✅ | Modifier service |
| `/providers/services/:id` | DELETE | ✅ | Supprimer service |
| `/providers/services/popular` | GET | ❌ | Services populaires |
| `/providers/services/categories/list` | GET | ❌ | Catégories |
| `/providers/services/:id` | GET | ✅ | Détails service |

### Spécialités (5)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/providers/specialties` | POST | Ajouter |
| `/providers/specialties/bulk` | POST | Ajouter en masse |
| `/providers/specialties` | GET | Lister |
| `/providers/specialties/:id` | PATCH | Modifier |
| `/providers/specialties/:id` | DELETE | Supprimer |

### Disponibilités (6)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/providers/availability` | POST | Créer créneaux |
| `/providers/availability` | GET | Lister |
| `/providers/availability/:id` | PATCH | Modifier |
| `/providers/availability/:id` | DELETE | Supprimer |
| `/providers/availability/block` | POST | Bloquer période |
| `/providers/availability/bulk` | DELETE | Supprimer en masse |

### Dashboard (7)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/providers/dashboard/summary` | GET | Résumé |
| `/providers/dashboard/statistics` | GET | Stats globales |
| `/providers/dashboard/revenue` | GET | Revenus |
| `/providers/dashboard/appointments` | GET | Stats RDV |
| `/providers/dashboard/upcoming` | GET | Prochains RDV |
| `/providers/dashboard/top-services` | GET | Top services |
| `/providers/dashboard/today` | GET | RDV du jour |

---

**Voir aussi:**
- [README.md](./README.md) - Index principal
- [AUTH.md](./AUTH.md) - Authentification
- [CLIENT.md](./CLIENT.md) - API Client
- [COMMON.md](./COMMON.md) - Références communes
