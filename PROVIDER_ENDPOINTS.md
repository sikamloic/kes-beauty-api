# 👤 Endpoints Provider

## ✅ Endpoints Disponibles

### 1. POST `/api/v1/providers/register`
Inscription d'un nouveau provider

**Body:**
```json
{
  "fullName": "Marie Dupont",
  "phone": "683264591",
  "password": "Password123",
  "city": "Douala"
}
```

**Réponse Succès (201):**
```json
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
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 3600
    },
    "message": "Inscription réussie! Prochaine étape: vérifiez votre téléphone par SMS."
  }
}
```

**Cookies:**
- `refreshToken` (HttpOnly, Secure, SameSite=strict)

---

### 2. GET `/api/v1/providers/profile`
Récupérer le profil du provider connecté

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "provider": {
      "id": 1,
      "businessName": null,
      "city": "Douala",
      "neighborhood": null,
      "address": null,
      "bio": null,
      "yearsExperience": 0,
      "latitude": null,
      "longitude": null,
      "createdAt": "2024-11-25T10:00:00Z",
      "updatedAt": "2024-11-25T10:00:00Z"
    },
    "user": {
      "id": 1,
      "phone": "237683264591",
      "email": null,
      "phoneVerifiedAt": null,
      "emailVerifiedAt": null,
      "isActive": true,
      "lastLoginAt": "2024-11-25T12:00:00Z",
      "createdAt": "2024-11-25T10:00:00Z"
    },
    "verification": {
      "id": 1,
      "providerId": 1,
      "status": "pending",
      "verifiedAt": null,
      "verifiedBy": null,
      "rejectionReason": null,
      "createdAt": "2024-11-25T10:00:00Z",
      "updatedAt": "2024-11-25T10:00:00Z"
    },
    "statistics": {
      "id": 1,
      "providerId": 1,
      "totalAppointments": 0,
      "completedAppointments": 0,
      "canceledAppointments": 0,
      "averageRating": "0.00",
      "totalReviews": 0,
      "totalRevenue": "0.00",
      "lastUpdated": "2024-11-25T10:00:00Z"
    },
    "serviceSettings": {
      "id": 1,
      "providerId": 1,
      "acceptsHomeService": false,
      "acceptsShopService": true,
      "advanceBookingDays": 7,
      "cancellationDeadlineHours": 24,
      "createdAt": "2024-11-25T10:00:00Z",
      "updatedAt": "2024-11-25T10:00:00Z"
    },
    "documents": []
  }
}
```

**Erreurs:**
- `401 Unauthorized` - Token manquant ou invalide
- `403 Forbidden` - Rôle incorrect (pas provider)
- `404 Not Found` - Provider non trouvé

---

### 3. PUT `/api/v1/providers/profile`
Mettre à jour le profil du provider connecté

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (tous les champs optionnels):**
```json
{
  "email": "provider@example.com",
  "businessName": "Salon Beauté Royale",
  "bio": "Coiffeuse professionnelle spécialisée en cheveux afro depuis 10 ans",
  "yearsExperience": 10,
  "address": "Quartier Akwa, Rue de la Joie",
  "neighborhood": "Akwa"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "businessName": "Salon Beauté Royale",
    "city": "Douala",
    "neighborhood": "Akwa",
    "address": "Quartier Akwa, Rue de la Joie",
    "bio": "Coiffeuse professionnelle spécialisée en cheveux afro depuis 10 ans",
    "yearsExperience": 10,
    "latitude": null,
    "longitude": null,
    "phone": "237683264591",
    "email": "provider@example.com",
    "phoneVerifiedAt": null,
    "emailVerifiedAt": null,
    "isActive": true,
    "lastLoginAt": "2024-11-25T12:00:00Z",
    "createdAt": "2024-11-25T10:00:00Z"
  }
}
```

**Erreurs:**
- `401 Unauthorized` - Token manquant ou invalide
- `403 Forbidden` - Rôle incorrect (pas provider)
- `404 Not Found` - Provider non trouvé

**Notes:**
- Tous les champs sont optionnels
- Seuls les champs fournis sont mis à jour
- Le profil complet est retourné après mise à jour
- Transaction atomique (user + provider)

---

## 🔐 Authentification

### Flow Complet

#### 1. Inscription
```bash
POST /api/v1/providers/register
{
  "fullName": "Marie Dupont",
  "phone": "683264591",
  "password": "Password123",
  "city": "Douala"
}

# Retourne: accessToken + refreshToken (cookie)
```

#### 2. Login (si déjà inscrit)
```bash
POST /api/v1/auth/login
{
  "login": "683264591",
  "password": "Password123"
}

# Retourne: accessToken + refreshToken (cookie)
```

#### 3. Récupérer Profil
```bash
GET /api/v1/providers/profile
Authorization: Bearer <accessToken>

# Retourne: Profil complet du provider
```

---

## 📱 Exemples cURL

### Inscription
```bash
curl -X POST http://localhost:4000/api/v1/providers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Marie Dupont",
    "phone": "683264591",
    "password": "Password123",
    "city": "Douala"
  }' \
  -c cookies.txt
```

### Login
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "683264591",
    "password": "Password123"
  }' \
  -c cookies.txt
```

### Récupérer Profil
```bash
# Extraire access token de la réponse login
ACCESS_TOKEN="eyJhbGc..."

curl -X GET http://localhost:4000/api/v1/providers/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies.txt
```

### Mettre à Jour Profil
```bash
ACCESS_TOKEN="eyJhbGc..."

curl -X PUT http://localhost:4000/api/v1/providers/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@example.com",
    "businessName": "Salon Beauté Royale",
    "bio": "Coiffeuse professionnelle depuis 10 ans",
    "yearsExperience": 10,
    "address": "Quartier Akwa, Rue de la Joie",
    "neighborhood": "Akwa"
  }' \
  -b cookies.txt
```

---

## 🛡️ Sécurité

### Guards Appliqués

**GET /providers/profile:**
- ✅ `JwtAuthGuard` - Vérifie token JWT valide
- ✅ `RolesGuard` - Vérifie rôle = 'provider'
- ✅ `@Roles('provider')` - Seuls les providers peuvent accéder

### Données Sensibles

**Protégées:**
- ❌ `passwordHash` jamais retourné
- ❌ Refresh token jamais en JSON (HttpOnly cookie)
- ❌ Données autres providers inaccessibles

**Accessibles:**
- ✅ Propre profil uniquement
- ✅ Données publiques (nom, ville, bio)
- ✅ Statistiques propres

---

## 🎯 Prochaines Étapes

---

## 📦 Services Provider

### 4. POST `/api/v1/providers/services`
Créer un nouveau service

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "categoryId": 1,
  "name": "Coupe + Brushing",
  "description": "Coupe de cheveux avec brushing inclus",
  "priceFcfa": 5000,
  "priceType": "fixed",
  "durationMinutes": 60,
  "bufferTimeMinutes": 15,
  "isActive": true,
  "requiresDeposit": false
}
```

**Réponse (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Coupe + Brushing",
    "categoryName": "Coiffure",
    "priceFcfa": 5000,
    "durationMinutes": 60
  }
}
```

---

### 5. GET `/api/v1/providers/services`
Liste des services du provider

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Coupe + Brushing",
      "categoryName": "Coiffure",
      "priceFcfa": 5000,
      "durationMinutes": 60,
      "isActive": true,
      "bookingCount": 12
    }
  ]
}
```

---

### 6. PUT `/api/v1/providers/services/:id`
Mettre à jour un service

---

### 7. DELETE `/api/v1/providers/services/:id`
Supprimer un service (soft delete)

---

### 8. GET `/api/v1/providers/services/categories/list`
Liste des catégories de services (endpoint public)

**Réponse (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "coiffure",
      "name": "Coiffure",
      "icon": "✂️",
      "children": [
        {
          "id": 2,
          "code": "coiffure_femme",
          "name": "Coiffure Femme"
        }
      ]
    }
  ]
}
```

---

## 🎯 Spécialités Provider

### 9. POST `/api/v1/providers/specialties`
Ajouter une spécialité

**Body:**
```json
{
  "categoryId": 1,
  "yearsExperience": 5,
  "isPrimary": true
}
```

---

### 10. GET `/api/v1/providers/specialties`
Liste des spécialités du provider

**Réponse (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "categoryName": "Coiffure",
      "yearsExperience": 5,
      "isPrimary": true,
      "badge": "Expert"
    }
  ]
}
```

---

### 11. PUT `/api/v1/providers/specialties/:id`
Mettre à jour une spécialité

---

### 12. DELETE `/api/v1/providers/specialties/:id`
Supprimer une spécialité (soft delete)

---

## 📅 Disponibilités Provider

### 13. POST `/api/v1/providers/availability/weekly`
Définir les horaires hebdomadaires

**Body:**
```json
{
  "days": [
    {
      "dayOfWeek": 1,
      "slots": [
        { "startTime": "09:00", "endTime": "12:00" },
        { "startTime": "14:00", "endTime": "18:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "slots": [
        { "startTime": "10:00", "endTime": "17:00" }
      ],
      "isActive": true
    }
  ]
}
```

**Réponse (200):**
```json
{
  "success": true,
  "data": {
    "days": [
      {
        "dayOfWeek": 1,
        "isActive": true,
        "slots": [
          { "startTime": "09:00", "endTime": "12:00" },
          { "startTime": "14:00", "endTime": "18:00" }
        ]
      }
    ]
  }
}
```

---

### 14. GET `/api/v1/providers/availability/weekly`
Récupérer les horaires hebdomadaires

---

### 15. PUT `/api/v1/providers/availability/weekly/day/:dayOfWeek/toggle`
Activer/désactiver un jour

**Body:**
```json
{
  "isActive": false
}
```

---

### 16. POST `/api/v1/providers/availability/exceptions`
Créer une exception (congé, horaires spéciaux)

**Body (Congé):**
```json
{
  "date": "2024-12-25",
  "type": "unavailable",
  "reason": "Jour férié - Noël"
}
```

**Body (Horaires spéciaux):**
```json
{
  "date": "2024-12-24",
  "type": "custom_hours",
  "startTime": "09:00",
  "endTime": "14:00",
  "reason": "Fermeture anticipée"
}
```

---

### 17. GET `/api/v1/providers/availability/exceptions`
Liste des exceptions

**Query Parameters:**
- `startDate` (optionnel): YYYY-MM-DD
- `endDate` (optionnel): YYYY-MM-DD

**Exemple:**
```
GET /providers/availability/exceptions?startDate=2024-12-01&endDate=2024-12-31
```

---

### 18. PUT `/api/v1/providers/availability/exceptions/:id`
Mettre à jour une exception

---

### 19. DELETE `/api/v1/providers/availability/exceptions/:id`
Supprimer une exception

---

## 🚀 Endpoints à Implémenter

1. **POST /providers/documents** - Upload documents
2. **GET /providers/appointments** - Liste rendez-vous
3. **GET /providers/reviews** - Liste avis clients
4. **GET /providers/statistics** - Statistiques provider

---

## ✅ Status Actuel

### Profil
- [x] POST /providers/register - Inscription
- [x] GET /providers/profile - Profil complet
- [x] PUT /providers/profile - Mise à jour profil

### Services
- [x] POST /providers/services - Créer service
- [x] GET /providers/services - Liste services
- [x] PUT /providers/services/:id - Modifier service
- [x] DELETE /providers/services/:id - Supprimer service (soft delete)
- [x] GET /providers/services/categories/list - Catégories (public)

### Spécialités
- [x] POST /providers/specialties - Ajouter spécialité
- [x] GET /providers/specialties - Liste spécialités
- [x] PUT /providers/specialties/:id - Modifier spécialité
- [x] DELETE /providers/specialties/:id - Supprimer spécialité (soft delete)

### Disponibilités
- [x] POST /providers/availability/weekly - Définir horaires
- [x] GET /providers/availability/weekly - Récupérer horaires
- [x] PUT /providers/availability/weekly/day/:dayOfWeek/toggle - Toggle jour
- [x] POST /providers/availability/exceptions - Créer exception
- [x] GET /providers/availability/exceptions - Liste exceptions
- [x] PUT /providers/availability/exceptions/:id - Modifier exception
- [x] DELETE /providers/availability/exceptions/:id - Supprimer exception

### Sécurité
- [x] Authentification JWT
- [x] Guards et rôles
- [x] Refresh tokens sécurisés (hashés SHA-256)
- [x] Cookie-based refresh token

### À Implémenter
- [ ] Upload documents
- [ ] Gestion rendez-vous
- [ ] Gestion avis clients
- [ ] Statistiques provider
