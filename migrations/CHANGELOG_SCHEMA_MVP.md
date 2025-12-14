# Changelog - database-schema-mvp.sql

## 2025-12-07 - Support Multilinguisme (i18n)

### ✅ Modifications apportées:

#### **1. Nouvelles tables ajoutées**

##### `business_types` (Section 11)
```sql
- id INT PRIMARY KEY
- code VARCHAR(50) UNIQUE
- icon VARCHAR(50)
- is_active BOOLEAN
- display_order INT
- created_at TIMESTAMP
```
**Données:** 8 types (freelance, salon, institut, spa, coworking, student, employee, enterprise)

##### `business_type_translations` (Section 12)
```sql
- id INT PRIMARY KEY
- business_type_id INT (FK)
- locale VARCHAR(5)
- label VARCHAR(100)
- description TEXT
- UNIQUE(business_type_id, locale)
```
**Données:** Traductions FR + EN pour les 8 types

##### `service_category_translations` (Section 14)
```sql
- id INT PRIMARY KEY
- category_id INT (FK)
- locale VARCHAR(5)
- name VARCHAR(100)
- description TEXT
- UNIQUE(category_id, locale)
```
**Données:** Traductions FR + EN pour 10 catégories

#### **2. Tables modifiées**

##### `provider_profiles`
**Ajouté:**
- `business_type_id INT NULL` (FK vers business_types)
- Index `idx_business_type`
- FK constraint avec ON DELETE RESTRICT

**Modifié:**
- `address TEXT` (était `TEXT NOT NULL`, maintenant nullable)

##### `service_categories`
**Supprimé:**
- `name VARCHAR(100)` → Déplacé vers `service_category_translations`

**Modifié:**
- `icon VARCHAR(50)` (était `VARCHAR(255)`)

**Ajouté:**
- Index `idx_active_order (is_active, display_order)`

#### **3. Données initiales ajoutées**

##### Business Types (8 entrées)
- freelance, salon, institut, spa, coworking, student, employee, enterprise
- Traductions FR + EN complètes

##### Service Categories (10 entrées)
- 5 catégories principales: coiffure, esthetique, manucure, massage, maquillage
- 5 sous-catégories: coiffure_afro, coiffure_lisse, coiffure_enfant, soin_visage, epilation
- Traductions FR + EN complètes

#### **4. DROP TABLE mis à jour**
Ajouté dans l'ordre correct (FK inverse):
```sql
DROP TABLE IF EXISTS service_category_translations;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS business_type_translations;
DROP TABLE IF EXISTS business_types;
```

### 🎯 Principe SOLID respecté

**OCP (Open/Closed Principle):**
- ✅ Ajouter une langue = INSERT (pas de modification de structure)
- ✅ Pas de recompilation nécessaire
- ✅ Extension sans modification

**SRP (Single Responsibility Principle):**
- ✅ Tables principales = données invariantes (code, icon)
- ✅ Tables traductions = données i18n (label, name, description)

### 📊 Impact sur la base de données

**Tables ajoutées:** 3
- `business_types`
- `business_type_translations`
- `service_category_translations`

**Colonnes ajoutées:** 1
- `provider_profiles.business_type_id`

**Colonnes supprimées:** 1
- `service_categories.name`

**Colonnes modifiées:** 2
- `service_categories.icon` (255 → 50)
- `provider_profiles.address` (NOT NULL → NULL)

**Index ajoutés:** 4
- `business_types.idx_active_order`
- `business_type_translations.idx_locale`
- `service_categories.idx_active_order`
- `service_category_translations.idx_locale`
- `provider_profiles.idx_business_type`

**Foreign Keys ajoutées:** 3
- `business_type_translations.business_type_id → business_types.id`
- `service_category_translations.category_id → service_categories.id`
- `provider_profiles.business_type_id → business_types.id`

### 🔄 Migration depuis l'ancienne version

Si vous avez une base existante avec l'ancienne structure:

```bash
# 1. Corriger les incohérences
mysql -u root -p beauty_db < migrations/fix_schema_inconsistencies.sql

# 2. Ajouter les traductions
mysql -u root -p beauty_db < migrations/add_translations_tables.sql

# 3. Regénérer Prisma
npx prisma generate
```

### 📝 Notes importantes

1. **`service_categories.name` supprimé** - Toutes les requêtes doivent maintenant JOIN avec `service_category_translations`
2. **`provider_profiles.address` nullable** - Cohérent avec Prisma schema
3. **Traductions EN** - Exemples fournis, à ajuster selon besoins
4. **Fallback** - Si traduction manquante, utiliser `code` comme fallback

### 🌍 Langues supportées

- ✅ **fr** (Français) - Complet
- ✅ **en** (Anglais) - Complet
- ⏳ **es** (Espagnol) - À ajouter si besoin
- ⏳ **de** (Allemand) - À ajouter si besoin

### 🔗 Fichiers liés

- `prisma/schema.prisma` - Modèles Prisma mis à jour
- `migrations/add_translations_tables.sql` - Migration pour bases existantes
- `migrations/fix_schema_inconsistencies.sql` - Corrections incohérences
- `src/providers/controllers/business-types.controller.ts` - Controller avec i18n
