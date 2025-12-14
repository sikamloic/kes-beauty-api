# 🔐 Endpoints d'Authentification

## ✅ Endpoints Disponibles

### 1. POST `/api/v1/auth/login`
Connexion avec téléphone/email + mot de passe

**Body:**
```json
{
  "login": "237683264591",  // ou "user@example.com"
  "password": "Password123"
}
```

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "userId": 1,
      "phone": "237683264591",
      "role": "provider",
      "providerId": 1
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Cookies:**
- `refreshToken` (HttpOnly, Secure, SameSite=strict, 7 jours)

**Erreurs:**
- `401 Unauthorized` - Identifiants invalides
- `400 Bad Request` - Validation échouée

---

### 2. POST `/api/v1/auth/refresh`
Rafraîchir l'access token

**Headers:**
- Cookie: `refreshToken=...` (automatique)

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

**Cookies:**
- Nouveau `refreshToken` (ancien révoqué)

**Erreurs:**
- `401 Unauthorized` - Refresh token manquant/invalide/révoqué

---

### 3. POST `/api/v1/auth/logout`
Déconnexion (révoque refresh token)

**Headers:**
- `Authorization: Bearer <accessToken>`
- Cookie: `refreshToken=...`

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "message": "Déconnexion réussie"
  }
}
```

**Cookies:**
- `refreshToken` supprimé

---

### 4. POST `/api/v1/auth/logout-all`
Déconnexion de tous les appareils

**Headers:**
- `Authorization: Bearer <accessToken>`

**Body:** Aucun

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "message": "Déconnecté de 3 appareil(s)"
  }
}
```

---

### 5. GET `/api/v1/auth/sessions`
Voir sessions actives

**Headers:**
- `Authorization: Bearer <accessToken>`

**Réponse Succès (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": 1,
        "device": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)...",
        "ip": "192.168.1.10",
        "createdAt": "2024-11-25T10:30:00Z",
        "lastUsedAt": "2024-11-25T12:30:00Z"
      },
      {
        "id": 2,
        "device": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "ip": "192.168.1.20",
        "createdAt": "2024-11-24T08:00:00Z",
        "lastUsedAt": "2024-11-25T09:00:00Z"
      }
    ]
  }
}
```

---

## 📱 Exemples d'Utilisation

### Connexion avec Téléphone
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "237683264591",
    "password": "Password123"
  }' \
  -c cookies.txt
```

### Connexion avec Email
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "provider@example.com",
    "password": "Password123"
  }' \
  -c cookies.txt
```

### Requête Authentifiée
```bash
curl -X GET http://localhost:4000/api/v1/providers/profile \
  -H "Authorization: Bearer eyJhbGc..." \
  -b cookies.txt
```

### Rafraîchir Token
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Déconnexion
```bash
curl -X POST http://localhost:4000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGc..." \
  -b cookies.txt
```

---

## 🔒 Sécurité

### Refresh Token
- ✅ Stocké en **HttpOnly Cookie** (pas accessible par JavaScript)
- ✅ **Secure** flag en production (HTTPS uniquement)
- ✅ **SameSite=strict** (protection CSRF)
- ✅ Stocké en **BD** pour révocation
- ✅ Durée: **7 jours**
- ✅ Limite: **5 appareils** maximum

### Access Token
- ✅ Retourné en **JSON** (stocké par client)
- ✅ Durée: **1 heure** (courte)
- ✅ Contient: `userId`, `role`, `providerId`/`clientId`
- ✅ Vérifié automatiquement par `JwtAuthGuard`

### Révocation
- ✅ Logout révoque le refresh token
- ✅ Logout-all révoque tous les tokens utilisateur
- ✅ Refresh génère nouveau token et révoque l'ancien
- ✅ Cleanup automatique des tokens expirés

---

## 🎯 Flow Complet

### 1. Inscription Provider
```
POST /api/v1/providers/register
→ Retourne accessToken + refreshToken (cookie)
→ Refresh token stocké en BD
```

### 2. Connexion
```
POST /api/v1/auth/login
→ Vérifie identifiants
→ Génère accessToken + refreshToken
→ Stocke refresh token en BD
→ Retourne accessToken + cookie refreshToken
```

### 3. Utilisation
```
GET /api/v1/providers/profile
Authorization: Bearer <accessToken>
→ JwtAuthGuard vérifie token
→ Extrait userId, role, providerId
→ Disponible dans req.user
```

### 4. Token Expiré
```
GET /api/v1/providers/profile
Authorization: Bearer <accessToken_expiré>
→ 401 Unauthorized

Frontend:
POST /api/v1/auth/refresh
Cookie: refreshToken
→ Nouveau accessToken
→ Réessayer requête
```

### 5. Déconnexion
```
POST /api/v1/auth/logout
Authorization: Bearer <accessToken>
Cookie: refreshToken
→ Révoque refresh token en BD
→ Supprime cookie
```

---

## 🧪 Tests

### Test Login Téléphone
```bash
# Inscription d'abord
curl -X POST http://localhost:4000/api/v1/providers/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test Provider",
    "phone": "683264591",
    "password": "Password123",
    "city": "Douala"
  }'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "237683264591",
    "password": "Password123"
  }' \
  -c cookies.txt -v
```

### Test Login Email (si email configuré)
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test@example.com",
    "password": "Password123"
  }' \
  -c cookies.txt
```

### Test Refresh
```bash
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -b cookies.txt \
  -c cookies.txt -v
```

### Test Sessions
```bash
# Récupérer access token du login
ACCESS_TOKEN="eyJhbGc..."

curl -X GET http://localhost:4000/api/v1/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b cookies.txt
```

---

## ✅ Checklist Implémentation

- [x] Table `refresh_tokens` créée
- [x] `RefreshTokenService` implémenté
- [x] `AuthController` créé
- [x] `LoginDto` avec validation
- [x] Endpoint `/auth/login` (téléphone ou email)
- [x] Endpoint `/auth/refresh`
- [x] Endpoint `/auth/logout`
- [x] Endpoint `/auth/logout-all`
- [x] Endpoint `/auth/sessions`
- [x] HttpOnly cookies configurés
- [x] Révocation tokens
- [x] Limite 5 appareils
- [x] AuthModule importé dans AppModule

---

## 🚀 Prêt à Tester!

L'API est maintenant prête avec:
- ✅ Inscription providers avec JWT
- ✅ Login avec téléphone ou email
- ✅ Refresh tokens sécurisés
- ✅ Gestion sessions multiples
- ✅ Révocation tokens
