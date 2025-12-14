# 🎯 Spécialités Provider

## ✅ Concept

**Problème résolu:**
- Provider peut déclarer ses **domaines d'expertise**
- Clients peuvent chercher **providers spécialisés**
- Système de **badges** selon expérience
- Distinction **spécialité principale** vs secondaires

---

## 📊 Architecture

### Table `provider_specialties`

```sql
CREATE TABLE provider_specialties (
    id INT PRIMARY KEY,
    provider_id INT,              -- FK vers provider_profiles
    category_id INT,              -- FK vers service_categories
    years_experience INT,         -- Années d'expérience
    is_primary BOOLEAN,           -- Spécialité principale
    created_at DATETIME,
    
    UNIQUE(provider_id, category_id)
);
```

**Contraintes:**
- ✅ Provider peut avoir **plusieurs spécialités**
- ✅ **Une seule** spécialité principale (`is_primary=true`)
- ✅ Pas de doublons (unique constraint)

---

## 🎖️ Système de Badges

**Badges automatiques selon expérience:**

| Années | Principale | Badge |
|--------|-----------|-------|
| 10+ | ✅ Oui | ⭐ **Expert Certifié** |
| 5-9 | ✅ Oui | ⭐ **Spécialiste Certifié** |
| 10+ | ❌ Non | **Expert** |
| 5-9 | ❌ Non | **Spécialiste** |
| 2-4 | - | **Confirmé** |
| 0-1 | - | **Débutant** |

---

## 📋 Endpoints

### 1. GET `/api/v1/providers/specialties`
Liste des spécialités du provider

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
        "icon": "scissors"
      },
      "yearsExperience": 3,
      "isPrimary": false,
      "badge": "Confirmé",
      "createdAt": "2024-12-03T10:05:00Z"
    }
  ]
}
```

---

### 2. POST `/api/v1/providers/specialties`
Ajouter une spécialité

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body:**
```json
{
  "categoryId": 6,
  "yearsExperience": 8,
  "isPrimary": true
}
```

**Réponse:**
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

**Erreurs:**
- `404` - Catégorie non trouvée
- `409` - Spécialité déjà existante

---

### 3. PUT `/api/v1/providers/specialties/:id`
Mettre à jour une spécialité

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Body (tous champs optionnels):**
```json
{
  "yearsExperience": 10,
  "isPrimary": true
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "category": {...},
    "yearsExperience": 10,
    "isPrimary": true,
    "badge": "Expert Certifié"
  }
}
```

**Note:** Si `isPrimary=true`, les autres spécialités sont automatiquement mises à `isPrimary=false`.

---

### 4. DELETE `/api/v1/providers/specialties/:id`
Supprimer une spécialité

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "message": "Spécialité supprimée avec succès"
  }
}
```

---

## 🎯 Cas d'Usage

### 1. Provider Déclare ses Spécialités

```typescript
// Provider: Coiffeuse spécialisée Cheveux Afro

// 1. Ajouter spécialité principale
POST /providers/specialties
{
  "categoryId": 6,  // Cheveux Afro
  "yearsExperience": 8,
  "isPrimary": true
}
// Badge: "Spécialiste Certifié"

// 2. Ajouter spécialité secondaire
POST /providers/specialties
{
  "categoryId": 7,  // Cheveux Lisses
  "yearsExperience": 3,
  "isPrimary": false
}
// Badge: "Confirmé"

// 3. Ajouter autre spécialité
POST /providers/specialties
{
  "categoryId": 10,  // Maquillage
  "yearsExperience": 2,
  "isPrimary": false
}
// Badge: "Confirmé"
```

**Résultat profil:**
```
Provider: "Salon Afro Beauty"
⭐ Spécialiste Certifié Cheveux Afro (8 ans)
✓ Confirmé Cheveux Lisses (3 ans)
✓ Confirmé Maquillage (2 ans)
```

---

### 2. Changer Spécialité Principale

```typescript
// Passer de "Cheveux Afro" à "Cheveux Lisses" comme principale

PUT /providers/specialties/2
{
  "isPrimary": true
}

// Automatiquement:
// - Spécialité 1 (Cheveux Afro): isPrimary = false
// - Spécialité 2 (Cheveux Lisses): isPrimary = true
```

---

### 3. Mise à Jour Expérience

```typescript
// Après 2 ans, passer de 8 à 10 ans d'expérience

PUT /providers/specialties/1
{
  "yearsExperience": 10
}

// Badge passe de "Spécialiste Certifié" à "Expert Certifié"
```

---

## 🔍 Recherche par Spécialité (Future)

**Endpoint à implémenter:**
```typescript
GET /providers/search?specialty=coiffure_afro&city=yaounde&badge=expert

// Retourne providers ayant:
// - Spécialité "Cheveux Afro"
// - Ville "Yaoundé"
// - Badge "Expert" ou "Expert Certifié"
```

---

## 💡 Différence avec Services

### `provider_specialties` (Compétences)
```
"Je suis SPÉCIALISTE en Cheveux Afro depuis 8 ans"
→ Déclaration de compétence
→ Badge professionnel
→ Marketing/Confiance
```

### `services` (Offres)
```
"Je propose le service 'Tresses Box Braids' à 15000 FCFA"
→ Service concret avec prix
→ Réservable par client
→ Catalogue d'offres
```

**Exemple complet:**
```json
{
  "provider": {
    "businessName": "Salon Afro Beauty",
    
    "specialties": [
      {
        "category": "Cheveux Afro",
        "yearsExperience": 8,
        "isPrimary": true,
        "badge": "⭐ Spécialiste Certifié"
      }
    ],
    
    "services": [
      {
        "name": "Tresses Box Braids",
        "category": "Cheveux Afro",
        "price": "15000",
        "duration": 180
      },
      {
        "name": "Vanilles",
        "category": "Cheveux Afro",
        "price": "8000",
        "duration": 120
      }
    ]
  }
}
```

---

## 🎨 Affichage UI

### Profil Provider

```
┌─────────────────────────────────────┐
│ 👤 Salon Afro Beauty                │
│ 📍 Yaoundé, Bastos                  │
│                                     │
│ 🎯 SPÉCIALITÉS                      │
│ ⭐ Spécialiste Certifié             │
│    Cheveux Afro (8 ans)             │
│                                     │
│ ✓ Confirmé                          │
│   Cheveux Lisses (3 ans)            │
│   Maquillage (2 ans)                │
│                                     │
│ 💼 SERVICES (12)                    │
│ • Tresses Box Braids - 15000 FCFA  │
│ • Vanilles - 8000 FCFA              │
│ • ...                               │
└─────────────────────────────────────┘
```

### Recherche

```
Résultats pour "Cheveux Afro" à Yaoundé:

┌─────────────────────────────────────┐
│ ⭐ Expert Certifié                  │
│ Salon Afro Beauty                   │
│ Cheveux Afro (12 ans)               │
│ 4.8★ (156 avis) • Bastos            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⭐ Spécialiste Certifié             │
│ Beauty Corner                       │
│ Cheveux Afro (7 ans)                │
│ 4.6★ (89 avis) • Mvan               │
└─────────────────────────────────────┘
```

---

## ✅ Avantages

**Pour Providers:**
- ✅ Se démarquer avec badges
- ✅ Montrer expertise
- ✅ Augmenter confiance clients
- ✅ Meilleur référencement

**Pour Clients:**
- ✅ Trouver vrais spécialistes
- ✅ Filtrer par expertise
- ✅ Confiance dans choix
- ✅ Voir années d'expérience

**Pour Plateforme:**
- ✅ Qualité providers
- ✅ Meilleur matching
- ✅ Réduction insatisfaction
- ✅ SEO optimisé

---

## 🧪 Tests

### Test Ajout Spécialité

```bash
# 1. Login provider
POST /auth/login
{ "login": "683264591", "password": "sikam@210301" }

# 2. Ajouter spécialité principale
POST /providers/specialties
Authorization: Bearer <accessToken>
{
  "categoryId": 6,
  "yearsExperience": 8,
  "isPrimary": true
}

# 3. Vérifier
GET /providers/specialties
Authorization: Bearer <accessToken>
```

### Test Changement Principale

```bash
# Ajouter 2ème spécialité comme principale
POST /providers/specialties
{
  "categoryId": 7,
  "yearsExperience": 5,
  "isPrimary": true
}

# Vérifier que l'ancienne n'est plus principale
GET /providers/specialties
# Spécialité 1: isPrimary = false
# Spécialité 2: isPrimary = true
```

---

## ✅ Status

- [x] Model Prisma ProviderSpecialty
- [x] DTOs (AddSpecialtyDto, UpdateSpecialtyDto)
- [x] Service ProviderSpecialtiesService
- [x] Controller ProviderSpecialtiesController
- [x] CRUD complet
- [x] Système badges automatique
- [x] Gestion spécialité principale unique
- [ ] Migration SQL exécutée
- [ ] Endpoint recherche par spécialité
- [ ] Affichage dans profil provider
- [ ] Filtres recherche avancée

---

## 🚀 Prochaines Étapes

1. **Exécuter migration** - `migrations/add_provider_specialties_table.sql`
2. **Tester CRUD** - Ajouter/modifier/supprimer spécialités
3. **Intégrer au profil** - Afficher spécialités dans `GET /providers/profile`
4. **Recherche** - `GET /providers/search?specialty=X`
5. **Statistiques** - Spécialités les plus demandées
