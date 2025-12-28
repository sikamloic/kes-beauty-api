# 📚 Documentation API - Kes Beauty

**Base URL:** `http://localhost:4000/api/v1`

**Version:** 1.0.0

---

## 📑 Structure de la Documentation

Cette documentation est organisée par **rôle utilisateur** et **fonctionnalité** pour faciliter l'intégration côté frontend.

### 📁 Fichiers de Documentation

| Fichier | Description | Audience |
|---------|-------------|----------|
| [AUTH.md](./AUTH.md) | Authentification, tokens, sessions | Tous |
| [CLIENT.md](./CLIENT.md) | Fonctionnalités client (réservations, recherche) | Développeurs App Client |
| [PROVIDER.md](./PROVIDER.md) | Fonctionnalités provider (profil, services, dashboard) | Développeurs App Provider |
| [COMMON.md](./COMMON.md) | Références communes (erreurs, formats, i18n) | Tous |

---

## 🎭 Rôles Utilisateurs

### Client (`client`)
- Rechercher des providers et services
- Réserver des rendez-vous
- Gérer ses rendez-vous (annulation)
- Consulter l'historique

### Provider (`provider`)
- Gérer son profil et business
- Créer et gérer ses services
- Définir ses disponibilités
- Gérer les rendez-vous clients
- Consulter son dashboard (stats, revenus)

### Admin (`admin`)
- Valider les providers
- Gérer les utilisateurs
- Configuration système
- *(Documentation à venir)*

---

## 🔐 Authentification Rapide

### Headers Requis

**Endpoints publics:**
```http
Content-Type: application/json
Accept-Language: fr  # Optionnel (fr par défaut)
```

**Endpoints authentifiés:**
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Flux d'Authentification

```
1. POST /auth/login          → Obtenir accessToken + refreshToken (cookie)
2. Utiliser accessToken      → Header Authorization: Bearer <token>
3. Token expiré?             → POST /auth/refresh (auto via cookie)
4. Déconnexion               → POST /auth/logout
```

---

## 📊 Résumé des Endpoints

### Par Rôle

| Rôle | Endpoints | Description |
|------|-----------|-------------|
| **Public** | 10 | Login, Register, Recherche, Business Types |
| **Client** | 4 | Appointments (créer, lister, annuler) |
| **Provider** | 30 | Profil, Services, Disponibilités, Dashboard |
| **Commun (Auth)** | 6 | Refresh, Logout, OTP |

### Par Module

| Module | Endpoints | Auth | Fichier |
|--------|-----------|------|---------|
| Auth | 7 | 2/7 | [AUTH.md](./AUTH.md) |
| Search (Providers) | 6 | 0/6 | [CLIENT.md](./CLIENT.md) |
| Appointments | 4 | 4/4 | [CLIENT.md](./CLIENT.md) |
| Provider Profile | 2 | 2/2 | [PROVIDER.md](./PROVIDER.md) |
| Provider Services | 7 | 5/7 | [PROVIDER.md](./PROVIDER.md) |
| Provider Specialties | 5 | 5/5 | [PROVIDER.md](./PROVIDER.md) |
| Provider Availability | 6 | 6/6 | [PROVIDER.md](./PROVIDER.md) |
| Provider Dashboard | 7 | 7/7 | [PROVIDER.md](./PROVIDER.md) |
| Business Types | 1 | 0/1 | [COMMON.md](./COMMON.md) |
| Service Categories | 1 | 0/1 | [COMMON.md](./COMMON.md) |

**Total: 46 endpoints**

---

## 🌍 Internationalisation

L'API supporte le multilinguisme via le header `Accept-Language`.

**Langues:** `fr` (défaut), `en`

**Ressources traduites:**
- Business Types
- Service Categories

```http
GET /business-types
Accept-Language: en
```

---

## ⚡ Quick Start

### 1. Inscription Provider
```bash
curl -X POST http://localhost:4000/api/v1/providers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Marie Dupont",
    "phone": "+237655443322",
    "password": "Password123!",
    "city": "Douala"
  }'
```

### 2. Connexion
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "+237655443322",
    "password": "Password123!"
  }'
```

### 3. Utiliser l'API
```bash
curl http://localhost:4000/api/v1/providers/profile \
  -H "Authorization: Bearer <accessToken>"
```

---

## 📝 Conventions

### Format des Réponses

**Succès:**
```json
{
  "success": true,
  "message": "Opération réussie",
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "path": "/api/v1/endpoint",
    "method": "GET",
    "duration": 12
  }
}
```

**Erreur:**
```json
{
  "success": false,
  "statusCode": 400,
  "code": "ERROR_CODE",
  "message": "Description de l'erreur",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "path": "/api/v1/endpoint"
}
```

### Pagination

```json
{
  "data": [...],
  "meta": {
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

## 🔗 Liens Utiles

- [Swagger UI](http://localhost:4000/api/docs) - Documentation interactive
- [API_ENDPOINTS.md](../API_ENDPOINTS.md) - Documentation technique complète

---

**Dernière mise à jour:** 2025-12-28
