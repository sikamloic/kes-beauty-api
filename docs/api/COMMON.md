# 📖 Références Communes

Documentation des éléments partagés entre tous les modules de l'API.

**Base URL:** `http://localhost:4000/api/v1`

---

## 📑 Table des Matières

1. [Format des Réponses](#format-des-réponses)
2. [Codes d'Erreur](#codes-derreur)
3. [Pagination](#pagination)
4. [Internationalisation](#internationalisation)
5. [Headers](#headers)
6. [Business Types](#business-types)
7. [Statuts des Rendez-vous](#statuts-des-rendez-vous)
8. [Validation](#validation)
9. [Rate Limiting](#rate-limiting)
10. [CORS](#cors)

---

## Format des Réponses

### Réponse Succès

Toutes les réponses réussies suivent ce format :

```json
{
  "success": true,
  "message": "Opération réussie",
  "data": {
    // Données de la réponse
  },
  "meta": {
    "timestamp": "2025-01-15T10:00:00.000Z",
    "path": "/api/v1/endpoint",
    "method": "GET",
    "duration": 12
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Toujours `true` pour les succès |
| `message` | string | Message descriptif |
| `data` | object/array | Données retournées |
| `meta` | object | Métadonnées de la requête |
| `meta.timestamp` | string | Horodatage ISO 8601 |
| `meta.path` | string | Chemin de l'endpoint |
| `meta.method` | string | Méthode HTTP |
| `meta.duration` | number | Durée en millisecondes |

### Réponse Erreur

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Les données fournies sont invalides",
  "timestamp": "2025-01-15T10:00:00.000Z",
  "path": "/api/v1/endpoint",
  "details": {
    "field": "email",
    "reason": "Format email invalide"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Toujours `false` pour les erreurs |
| `statusCode` | number | Code HTTP |
| `code` | string | Code d'erreur applicatif |
| `message` | string | Message d'erreur lisible |
| `timestamp` | string | Horodatage |
| `path` | string | Endpoint appelé |
| `details` | object | Détails additionnels (optionnel) |

---

## Codes d'Erreur

### Erreurs d'Authentification (4xx)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `INVALID_CREDENTIALS` | 401 | Identifiants incorrects | Vérifier login/password |
| `UNAUTHORIZED` | 401 | Token manquant ou invalide | Se reconnecter |
| `TOKEN_EXPIRED` | 401 | Token expiré | Utiliser refresh token |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token invalide | Se reconnecter |
| `TOKEN_REVOKED` | 401 | Token révoqué | Se reconnecter |
| `FORBIDDEN` | 403 | Accès refusé | Vérifier les permissions |
| `ACCOUNT_DISABLED` | 403 | Compte désactivé | Contacter support |

### Erreurs de Validation (400)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `VALIDATION_ERROR` | 400 | Données invalides | Corriger les champs |
| `BAD_REQUEST` | 400 | Requête malformée | Vérifier le format |
| `INVALID_PHONE` | 400 | Format téléphone invalide | Format +237XXXXXXXXX |
| `INVALID_CODE` | 400 | Code OTP incorrect | Vérifier le code |
| `CODE_EXPIRED` | 400 | Code OTP expiré | Demander nouveau code |
| `PAST_DATE` | 400 | Date dans le passé | Choisir date future |
| `INVALID_STATUS` | 400 | Statut invalide | Vérifier les transitions |
| `INVALID_TRANSITION` | 400 | Transition non autorisée | Vérifier le workflow |
| `TOO_LATE` | 400 | Action tardive | Délai dépassé |

### Erreurs de Ressource (404, 409)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `NOT_FOUND` | 404 | Ressource non trouvée | Vérifier l'ID |
| `PROVIDER_NOT_FOUND` | 404 | Provider inexistant | Vérifier l'ID |
| `SERVICE_NOT_FOUND` | 404 | Service inexistant | Vérifier l'ID |
| `APPOINTMENT_NOT_FOUND` | 404 | RDV inexistant | Vérifier l'ID |
| `CONFLICT` | 409 | Conflit de données | Ressource existe déjà |
| `PHONE_EXISTS` | 409 | Téléphone déjà utilisé | Utiliser autre numéro |
| `EMAIL_EXISTS` | 409 | Email déjà utilisé | Utiliser autre email |
| `SLOT_NOT_AVAILABLE` | 409 | Créneau indisponible | Choisir autre créneau |
| `SLOT_OVERLAP` | 409 | Chevauchement de créneaux | Ajuster les horaires |

### Erreurs de Rate Limiting (429)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `TOO_MANY_REQUESTS` | 429 | Trop de requêtes | Attendre |
| `TOO_MANY_ATTEMPTS` | 429 | Trop de tentatives | Attendre 5 minutes |

### Erreurs Serveur (5xx)

| Code | Status | Description | Action |
|------|--------|-------------|--------|
| `INTERNAL_ERROR` | 500 | Erreur serveur | Réessayer plus tard |
| `SERVICE_UNAVAILABLE` | 503 | Service indisponible | Réessayer plus tard |

---

## Pagination

### Paramètres de Requête

| Paramètre | Type | Défaut | Max | Description |
|-----------|------|--------|-----|-------------|
| `page` | number | 1 | - | Numéro de page (1-indexed) |
| `limit` | number | 10 | 50 | Éléments par page |

### Format de Réponse

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 156,
      "totalPages": 16
    },
    "timestamp": "2025-01-15T10:00:00.000Z"
  }
}
```

| Champ | Description |
|-------|-------------|
| `page` | Page actuelle |
| `limit` | Éléments par page |
| `total` | Nombre total d'éléments |
| `totalPages` | Nombre total de pages |

### Exemple d'utilisation

```http
# Page 1, 10 éléments (défaut)
GET /appointments/my

# Page 2, 20 éléments
GET /appointments/my?page=2&limit=20

# Avec filtres
GET /appointments/my?status=pending&page=1&limit=10
```

---

## Internationalisation

### Langues Supportées

| Code | Langue | Défaut |
|------|--------|--------|
| `fr` | Français | ✅ |
| `en` | Anglais | |

### Header Accept-Language

```http
GET /business-types
Accept-Language: en
```

**Formats acceptés:**
- `fr`
- `en`
- `fr-FR`
- `en-US`
- `fr-FR,en;q=0.9`

Seul le code langue principal est utilisé.

### Ressources Traduites

| Ressource | Endpoint | Champs traduits |
|-----------|----------|-----------------|
| Business Types | `GET /business-types` | `label`, `description` |
| Service Categories | `GET /providers/services/categories/list` | `name`, `description` |

### Comportement par Défaut

- Header absent → Français
- Langue non supportée → Français
- Traduction manquante → Français

---

## Headers

### Headers de Requête

#### Endpoints Publics

```http
Content-Type: application/json
Accept: application/json
Accept-Language: fr
```

#### Endpoints Authentifiés

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json
Accept-Language: fr
```

### Headers de Réponse

```http
Content-Type: application/json
X-Request-Id: uuid-v4
X-Response-Time: 45ms
```

### Headers Personnalisés (Optionnels)

| Header | Description | Exemple |
|--------|-------------|---------|
| `X-Platform` | Plateforme client | `ios`, `android`, `web` |
| `X-Client-Version` | Version de l'app | `1.2.0` |
| `X-Device-Id` | ID unique appareil | `uuid` |
| `X-Request-Id` | ID de requête (traçabilité) | `uuid` |

---

## Business Types

Types de business disponibles pour les providers.

**Endpoint:** `GET /business-types`

**Auth Required:** ❌ Non

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "salon",
      "label": "Salon de coiffure",
      "description": "Établissement professionnel de coiffure avec local dédié",
      "icon": "store"
    },
    {
      "id": 2,
      "code": "freelance",
      "label": "Coiffeuse indépendante",
      "description": "Prestataire à domicile ou en déplacement",
      "icon": "user"
    },
    {
      "id": 3,
      "code": "home_service",
      "label": "Service à domicile",
      "description": "Prestation exclusivement à domicile",
      "icon": "home"
    }
  ]
}
```

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| `id` | number | Identifiant unique |
| `code` | string | Code technique |
| `label` | string | Libellé traduit |
| `description` | string | Description traduite |
| `icon` | string | Nom d'icône (Lucide) |

### Utilisation

Le `businessTypeId` est utilisé lors de la mise à jour du profil provider :

```json
PATCH /providers/profile
{
  "businessTypeId": 1
}
```

---

## Statuts des Rendez-vous

### Liste des Statuts

| Statut | Description | Qui peut changer |
|--------|-------------|------------------|
| `pending` | En attente de confirmation | Provider |
| `confirmed` | Confirmé par le provider | Provider |
| `in_progress` | Prestation en cours | Provider |
| `completed` | Prestation terminée | Provider |
| `cancelled` | Annulé | Client ou Provider |
| `no_show` | Client absent | Provider |

### Diagramme de Transitions

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │confirmed │ │cancelled │ │ (refusé) │
        └────┬─────┘ └──────────┘ └──────────┘
             │
    ┌────────┼────────┬────────────┐
    │        │        │            │
    ▼        ▼        ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│in_prog │ │no_show │ │cancelled │ │ (client  │
└───┬────┘ └────────┘ └──────────┘ │  annule) │
    │                              └──────────┘
    ▼
┌──────────┐
│completed │
└──────────┘
```

### Transitions Autorisées

| De | Vers | Acteur | Condition |
|----|------|--------|-----------|
| `pending` | `confirmed` | Provider | - |
| `pending` | `cancelled` | Provider | Refus |
| `pending` | `cancelled` | Client | 24h avant |
| `confirmed` | `in_progress` | Provider | - |
| `confirmed` | `cancelled` | Provider | - |
| `confirmed` | `cancelled` | Client | 24h avant |
| `confirmed` | `no_show` | Provider | Client absent |
| `in_progress` | `completed` | Provider | - |

### Règles d'Annulation Client

- ✅ Statut `pending` ou `confirmed`
- ✅ Minimum 24 heures avant le RDV
- ❌ Statut `in_progress`, `completed`, `cancelled`, `no_show`
- ❌ Moins de 24h avant le RDV

---

## Validation

### Téléphone Camerounais

Format accepté : `+237XXXXXXXXX`

```
+237 6XX XXX XXX  (Mobile)
+237 2XX XXX XXX  (Fixe)
```

**Opérateurs mobiles:**
- `65X`, `66X`, `67X`, `68X`, `69X` - MTN
- `65X`, `66X` - Orange
- `62X` - Camtel

### Mot de Passe Fort

Règles de validation :

| Règle | Description |
|-------|-------------|
| Longueur | 8-100 caractères |
| Majuscule | Au moins 1 (A-Z) |
| Minuscule | Au moins 1 (a-z) |
| Chiffre | Au moins 1 (0-9) |
| Spécial | Au moins 1 (@$!%*?&) |

**Exemples valides:**
- `Password123!`
- `MonMotDePasse@2025`
- `Secure$Pass99`

**Exemples invalides:**
- `password` (pas de majuscule, chiffre, spécial)
- `PASSWORD123` (pas de minuscule, spécial)
- `Pass1!` (trop court)

### Dates et Heures

| Format | Exemple | Usage |
|--------|---------|-------|
| Date ISO 8601 | `2025-01-15T10:00:00.000Z` | `scheduledAt` |
| Date simple | `2025-01-15` | Filtres, disponibilités |
| Heure | `09:00` | Créneaux horaires |

### Prix

- Entier positif en FCFA
- Minimum : 100 FCFA
- Maximum : 10 000 000 FCFA

### Durée

- Entier positif en minutes
- Minimum : 15 minutes
- Maximum : 480 minutes (8h)

---

## Rate Limiting

### Limites par Défaut

| Scope | Limite | Fenêtre |
|-------|--------|---------|
| Global | 100 requêtes | 1 minute |
| Auth (login) | 5 requêtes | 1 minute |
| OTP | 3 requêtes | 5 minutes |

### Headers de Réponse

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312860
```

### Réponse 429

```json
{
  "success": false,
  "statusCode": 429,
  "code": "TOO_MANY_REQUESTS",
  "message": "Trop de requêtes, veuillez réessayer plus tard",
  "retryAfter": 60
}
```

---

## CORS

### Configuration Développement

```
Origins autorisées:
- http://localhost:*
- http://127.0.0.1:*

Credentials: true
```

### Configuration Production

```
Origins autorisées: Variable ALLOWED_ORIGINS
Credentials: true
```

### Headers Autorisés

```
Content-Type
Authorization
X-Requested-With
X-Platform
X-Request-Id
X-Client-Version
X-Device-Id
Accept
Accept-Language
```

### Headers Exposés

```
X-Request-Id
X-Response-Time
```

### Méthodes Autorisées

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## 📊 Résumé

### Codes HTTP Utilisés

| Code | Signification | Usage |
|------|---------------|-------|
| 200 | OK | Succès GET, PATCH, DELETE |
| 201 | Created | Succès POST (création) |
| 400 | Bad Request | Validation échouée |
| 401 | Unauthorized | Auth requise/invalide |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource inexistante |
| 409 | Conflict | Conflit (doublon) |
| 429 | Too Many Requests | Rate limit |
| 500 | Internal Error | Erreur serveur |

### Villes Disponibles

- Douala
- Yaoundé
- Bafoussam
- Garoua
- Bamenda

---

**Voir aussi:**
- [README.md](./README.md) - Index principal
- [AUTH.md](./AUTH.md) - Authentification
- [CLIENT.md](./CLIENT.md) - API Client
- [PROVIDER.md](./PROVIDER.md) - API Provider
