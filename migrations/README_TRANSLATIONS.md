# Migration: Support Multilinguisme (i18n)

## 📋 Objectif

Ajouter le support du multilinguisme pour `business_types` et `service_categories` en respectant le principe SOLID (OCP).

## 🎯 Principe SOLID respecté

**OCP (Open/Closed Principle):**
- ✅ Ajouter une nouvelle langue = **INSERT** (pas de modification de code)
- ✅ Pas besoin de recompiler ou redéployer
- ✅ Structure extensible sans modification

## 📁 Fichiers modifiés

1. **`migrations/add_translations_tables.sql`** - Migration SQL complète
2. **`prisma/schema.prisma`** - Ajout des modèles de traductions
3. **`src/providers/controllers/business-types.controller.ts`** - Support Accept-Language

## 🚀 Étapes d'exécution

### 1. Backup de la base de données

```bash
mysqldump -u root -p beauty_db > backup_before_translations_$(date +%Y%m%d).sql
```

### 2. Exécuter la migration SQL

```bash
mysql -u root -p beauty_db < migrations/add_translations_tables.sql
```

**La migration effectue:**
- ✅ Crée `business_type_translations`
- ✅ Crée `service_category_translations`
- ✅ Migre les données existantes vers FR
- ✅ Ajoute les traductions EN (exemples)
- ✅ Supprime les anciennes colonnes `label`, `name`, `description`
- ✅ Affiche les vérifications

### 3. Regénérer Prisma Client

```bash
npx prisma generate
```

### 4. Redémarrer l'application

```bash
npm run start:dev
```

## 🧪 Tests

### Test 1: Récupérer en français (défaut)

```bash
curl http://localhost:4000/api/v1/business-types
```

### Test 2: Récupérer en anglais

```bash
curl -H "Accept-Language: en" http://localhost:4000/api/v1/business-types
```

### Test 3: Vérifier les données en base

```sql
-- Voir toutes les traductions d'un business_type
SELECT 
  bt.code,
  btt.locale,
  btt.label,
  btt.description
FROM business_types bt
JOIN business_type_translations btt ON bt.id = btt.business_type_id
WHERE bt.code = 'freelance';

-- Voir toutes les traductions d'une catégorie
SELECT 
  sc.code,
  sct.locale,
  sct.name,
  sct.description
FROM service_categories sc
JOIN service_category_translations sct ON sc.id = sct.category_id
WHERE sc.code = 'coiffure_afro';
```

## 📝 Ajouter une nouvelle langue

### Exemple: Ajouter l'espagnol (es)

```sql
-- Business types
INSERT INTO business_type_translations (business_type_id, locale, label, description)
SELECT 
  id,
  'es' as locale,
  CASE code
    WHEN 'freelance' THEN 'Autónomo'
    WHEN 'salon' THEN 'Gerente de salón'
    -- ... autres traductions
  END as label,
  NULL as description
FROM business_types;

-- Service categories
INSERT INTO service_category_translations (category_id, locale, name, description)
SELECT 
  id,
  'es' as locale,
  CASE code
    WHEN 'coiffure_afro' THEN 'Cabello Afro'
    WHEN 'maquillage' THEN 'Maquillaje'
    -- ... autres traductions
  END as name,
  NULL as description
FROM service_categories;
```

**Aucun code à modifier!** Le contrôleur détecte automatiquement la langue via `Accept-Language`.

## 🔄 Rollback (si nécessaire)

```sql
-- Restaurer le backup
mysql -u root -p beauty_db < backup_before_translations_YYYYMMDD.sql

-- OU manuellement:

-- 1. Ajouter les colonnes supprimées
ALTER TABLE business_types 
ADD COLUMN label VARCHAR(100),
ADD COLUMN description TEXT;

ALTER TABLE service_categories 
ADD COLUMN name VARCHAR(100),
ADD COLUMN description TEXT;

-- 2. Restaurer les données FR
UPDATE business_types bt
JOIN business_type_translations btt ON bt.id = btt.business_type_id
SET bt.label = btt.label, bt.description = btt.description
WHERE btt.locale = 'fr';

UPDATE service_categories sc
JOIN service_category_translations sct ON sc.id = sct.category_id
SET sc.name = sct.name, sc.description = sct.description
WHERE sct.locale = 'fr';

-- 3. Supprimer les tables de traductions
DROP TABLE business_type_translations;
DROP TABLE service_category_translations;
```

## 📊 Structure finale

### business_types
```
id | code      | icon     | is_active | display_order
1  | freelance | user     | 1         | 1
2  | salon     | scissors | 1         | 2
```

### business_type_translations
```
id | business_type_id | locale | label                    | description
1  | 1                | fr     | A mon compte (freelance) | Je travaille seul(e)...
2  | 1                | en     | Freelance                | I work independently...
3  | 2                | fr     | Gerant d'un salon        | Je gere un salon...
4  | 2                | en     | Salon Manager            | I manage a salon...
```

## 🌍 Langues supportées

- ✅ **fr** (Français) - Défaut
- ✅ **en** (Anglais) - Inclus dans la migration
- ⏳ **es** (Espagnol) - À ajouter si besoin
- ⏳ **de** (Allemand) - À ajouter si besoin

## 🔍 Détection de langue

Le contrôleur parse le header `Accept-Language`:

```
Accept-Language: fr-FR,fr;q=0.9,en;q=0.8
                 ↓
                 fr
```

**Fallback:** Si la langue n'est pas supportée ou absente → `fr` (défaut)

## ⚠️ Important

- Les traductions EN sont des **exemples** dans la migration
- Vous devrez probablement les ajuster selon vos besoins
- Pensez à ajouter les traductions pour toutes les catégories existantes
- Le code utilise un **fallback** sur `code` si la traduction est manquante

## 📚 Documentation API

Le endpoint `GET /business-types` supporte maintenant:

**Headers:**
```
Accept-Language: fr  (ou en, es, etc.)
```

**Réponse:**
```json
[
  {
    "id": 1,
    "code": "freelance",
    "icon": "user",
    "label": "Freelance",  // Traduit selon Accept-Language
    "description": "I work independently on my own"
  }
]
```
