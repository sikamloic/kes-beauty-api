# 💼 Gestion des Services Provider

## ✅ Architecture Implémentée

### Models Prisma

**ServiceCategory** - Catégories hiérarchiques
```prisma
model ServiceCategory {
  id           Int
  code         String  // coiffure, esthetique, etc.
  name         String
  description  String?
  icon         String?
  parentId     Int?    // Pour sous-catégories
  displayOrder Int
  isActive     Boolean
  
  parent   ServiceCategory?
  children ServiceCategory[]
  services Service[]
}
```

**Service** - Services proposés par providers
```prisma
model Service {
  id          Int
  providerId  Int
  categoryId  Int
  name        String
  description String?
  price       Decimal  // FCFA
  duration    Int      // minutes
  isActive    Boolean
  
  provider ProviderProfile
  category ServiceCategory
}
```

---

## 📋 Endpoints Disponibles

### 1. GET `/api/v1/providers/services`
Liste des services du provider connecté

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coiffure Afro - Tresses",
      "description": "Tresses africaines traditionnelles",
      "price": "15000",
      "duration": 180,
      "isActive": true,
      "category": {
        "id": 1,
        "code": "coiffure_afro",
        "name": "Cheveux Afro",
        "icon": "scissors"
      },
      "createdAt": "2024-11-27T10:00:00Z",
      "updatedAt": "2024-11-27T10:00:00Z"
    }
  ]
}
```

---

### 2. POST `/api/v1/providers/services`
Créer un nouveau service

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "categoryId": 1,
  "name": "Coiffure Afro - Tresses",
  "description": "Tresses africaines traditionnelles, durée 3-4 heures",
  "price": 15000,
  "duration": 180
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Coiffure Afro - Tresses",
    "description": "Tresses africaines traditionnelles, durée 3-4 heures",
    "price": "15000",
    "duration": 180,
    "isActive": true,
    "category": {
      "id": 1,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "createdAt": "2024-11-27T10:00:00Z"
  }
}
```

---

### 3. GET `/api/v1/providers/services/:id`
Détails d'un service spécifique

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Coiffure Afro - Tresses",
    "description": "Tresses africaines traditionnelles",
    "price": "15000",
    "duration": 180,
    "isActive": true,
    "category": {
      "id": 1,
      "code": "coiffure_afro",
      "name": "Cheveux Afro",
      "icon": "scissors"
    },
    "createdAt": "2024-11-27T10:00:00Z",
    "updatedAt": "2024-11-27T10:00:00Z"
  }
}
```

---

### 4. PUT `/api/v1/providers/services/:id`
Mettre à jour un service

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (tous champs optionnels):**
```json
{
  "name": "Coiffure Afro - Tresses Box Braids",
  "price": 18000,
  "duration": 240,
  "isActive": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Coiffure Afro - Tresses Box Braids",
    "price": "18000",
    "duration": 240,
    "isActive": true,
    "category": {...},
    "updatedAt": "2024-11-27T12:00:00Z"
  }
}
```

---

### 5. DELETE `/api/v1/providers/services/:id`
Supprimer un service (soft delete)

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "message": "Service supprimé avec succès"
  }
}
```

---

### 6. GET `/api/v1/providers/services/categories/list`
Liste des catégories disponibles

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "coiffure",
      "name": "Coiffure",
      "description": "Services de coiffure professionnelle",
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
        }
      ]
    },
    {
      "id": 2,
      "code": "esthetique",
      "name": "Esthétique",
      "description": "Soins esthétiques et bien-être",
      "icon": "spa",
      "children": []
    }
  ]
}
```

---

## 🎯 Cas d'Usage

### 1. Provider Ajoute ses Services

```typescript
// 1. Récupérer les catégories disponibles
GET /providers/services/categories/list

// 2. Créer service 1 - Tresses
POST /providers/services
{
  "categoryId": 6,  // coiffure_afro
  "name": "Tresses Box Braids",
  "description": "Tresses africaines style Box Braids",
  "price": 15000,
  "duration": 180
}

// 3. Créer service 2 - Défrisage
POST /providers/services
{
  "categoryId": 7,  // coiffure_lisse
  "name": "Défrisage cheveux courts",
  "description": "Défrisage professionnel",
  "price": 8000,
  "duration": 90
}

// 4. Voir tous ses services
GET /providers/services
```

### 2. Provider Met à Jour Prix

```typescript
// Augmenter le prix d'un service
PUT /providers/services/1
{
  "price": 18000
}
```

### 3. Provider Désactive Service

```typescript
// Désactiver temporairement
PUT /providers/services/1
{
  "isActive": false
}

// Ou supprimer définitivement
DELETE /providers/services/1
```

---

## 🔒 Sécurité

### Guards Appliqués

**Tous les endpoints:**
- ✅ `JwtAuthGuard` - Token JWT valide requis
- ✅ `RolesGuard` - Rôle 'provider' requis
- ✅ Provider ne peut gérer que SES services

### Validations

**Création service:**
- ✅ Catégorie existe et active
- ✅ Prix: 0 - 1,000,000 FCFA
- ✅ Durée: 15 - 480 minutes
- ✅ Nom: 3 - 255 caractères

**Mise à jour:**
- ✅ Service appartient au provider
- ✅ Validations identiques

**Suppression:**
- ✅ Soft delete (deletedAt)
- ✅ Service marqué isActive=false

---

## 📊 Catégories Pré-configurées

### Catégories Principales

1. **Coiffure** (`coiffure`)
   - Cheveux Afro (`coiffure_afro`)
   - Cheveux Lisses (`coiffure_lisse`)
   - Coiffure Enfant (`coiffure_enfant`)

2. **Esthétique** (`esthetique`)
   - Soins visage
   - Soins corps
   - Épilation

3. **Manucure & Pédicure** (`manucure`)
   - Manucure classique
   - Manucure gel
   - Pédicure

4. **Massage** (`massage`)
   - Massage relaxant
   - Massage thérapeutique

5. **Maquillage** (`maquillage`)
   - Maquillage jour
   - Maquillage soirée
   - Maquillage mariée

---

## 🧪 Tests

### Test Création Service

```bash
# 1. Login provider
POST /auth/login
{ "login": "683264591", "password": "sikam@210301" }

# 2. Copier accessToken

# 3. Voir catégories
GET /providers/services/categories/list
Authorization: Bearer <accessToken>

# 4. Créer service
POST /providers/services
Authorization: Bearer <accessToken>
{
  "categoryId": 1,
  "name": "Tresses Box Braids",
  "description": "Tresses africaines",
  "price": 15000,
  "duration": 180
}

# 5. Vérifier création
GET /providers/services
Authorization: Bearer <accessToken>
```

### Test Mise à Jour

```bash
PUT /providers/services/1
Authorization: Bearer <accessToken>
{
  "price": 18000,
  "duration": 240
}
```

### Test Suppression

```bash
DELETE /providers/services/1
Authorization: Bearer <accessToken>
```

---

## ✅ Status

- [x] Models Prisma (ServiceCategory, Service)
- [x] DTOs (CreateServiceDto, UpdateServiceDto)
- [x] Service ProviderServicesService
- [x] Controller ProviderServicesController
- [x] CRUD complet services
- [x] Liste catégories hiérarchiques
- [x] Guards JWT + Roles
- [x] Soft delete
- [ ] Upload photos services
- [ ] Filtres recherche (catégorie, prix, durée)
- [ ] Services populaires/recommandés

---

## 🎯 Prochaines Étapes

1. **Upload Photos Services** - Avant/après
2. **Recherche Services** - Par catégorie, prix, localisation
3. **Services Favoris** - Clients peuvent favoriser
4. **Statistiques Services** - Plus demandés, revenus par service
