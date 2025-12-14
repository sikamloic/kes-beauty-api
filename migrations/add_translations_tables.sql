-- =============================================================================
-- Migration: Ajout des tables de traductions pour business_types et service_categories
-- Date: 2025-12-07
-- Description: 
--   - Crée les tables de traductions pour supporter le multilinguisme
--   - Migre les données existantes vers les nouvelles tables
--   - Supprime les colonnes label/name/description des tables principales
--   - Respecte le principe SOLID (OCP: ajouter une langue = INSERT)
-- =============================================================================

-- ÉTAPE 1: Créer les tables de traductions
-- ============================================

CREATE TABLE business_type_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  business_type_id INT NOT NULL COMMENT 'FK vers business_types',
  locale VARCHAR(5) NOT NULL COMMENT 'Code langue (fr, en, etc.)',
  label VARCHAR(100) NOT NULL COMMENT 'Libellé traduit',
  description TEXT COMMENT 'Description traduite',
  
  UNIQUE KEY unique_translation (business_type_id, locale),
  FOREIGN KEY (business_type_id) REFERENCES business_types(id) ON DELETE CASCADE,
  INDEX idx_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Traductions des types de business';

CREATE TABLE service_category_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL COMMENT 'FK vers service_categories',
  locale VARCHAR(5) NOT NULL COMMENT 'Code langue (fr, en, etc.)',
  name VARCHAR(100) NOT NULL COMMENT 'Nom traduit',
  description TEXT COMMENT 'Description traduite',
  
  UNIQUE KEY unique_translation (category_id, locale),
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
  INDEX idx_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Traductions des catégories de service';


-- ÉTAPE 2: Migrer les données existantes (FR par défaut)
-- ========================================================

-- Migrer business_types vers business_type_translations (FR)
INSERT INTO business_type_translations (business_type_id, locale, label, description)
SELECT 
  id,
  'fr' as locale,
  label,
  description
FROM business_types
WHERE label IS NOT NULL;

-- Migrer service_categories vers service_category_translations (FR)
INSERT INTO service_category_translations (category_id, locale, name, description)
SELECT 
  id,
  'fr' as locale,
  name,
  NULL as description
FROM service_categories
WHERE name IS NOT NULL;


-- ÉTAPE 3: Ajouter les traductions EN (si nécessaire)
-- =====================================================

-- Traductions EN pour business_types (à compléter selon besoins)
INSERT INTO business_type_translations (business_type_id, locale, label, description)
SELECT 
  id,
  'en' as locale,
  CASE code
    WHEN 'freelance' THEN 'Freelance'
    WHEN 'salon' THEN 'Salon Manager'
    WHEN 'institut' THEN 'Institute Manager'
    WHEN 'spa' THEN 'Spa Manager'
    WHEN 'coworking' THEN 'Coworking Manager'
    WHEN 'student' THEN 'Student'
    WHEN 'employee' THEN 'Employee'
    WHEN 'enterprise' THEN 'Enterprise'
    ELSE code
  END as label,
  CASE code
    WHEN 'freelance' THEN 'I work independently on my own'
    WHEN 'salon' THEN 'I manage a salon with employees'
    WHEN 'institut' THEN 'I manage a beauty institute'
    WHEN 'spa' THEN 'I manage a spa or wellness center'
    WHEN 'coworking' THEN 'I rent spaces to other professionals'
    WHEN 'student' THEN 'I am in training, reduced rates'
    WHEN 'employee' THEN 'I am an employee of an establishment'
    WHEN 'enterprise' THEN 'B2B structure for events and brands'
    ELSE NULL
  END as description
FROM business_types;

-- Traductions EN pour service_categories
-- Basé sur les codes réels: coiffure, esthetique, manucure, massage, maquillage
INSERT INTO service_category_translations (category_id, locale, name, description)
SELECT 
  id,
  'en' as locale,
  CASE code
    WHEN 'coiffure' THEN 'Hair Styling'
    WHEN 'esthetique' THEN 'Aesthetics'
    WHEN 'manucure' THEN 'Manicure & Pedicure'
    WHEN 'massage' THEN 'Massage'
    WHEN 'maquillage' THEN 'Makeup'
    -- Codes additionnels si présents
    WHEN 'coiffure_afro' THEN 'Afro Hair'
    WHEN 'coiffure_lisse' THEN 'Straight Hair'
    WHEN 'pedicure' THEN 'Pedicure'
    WHEN 'epilation' THEN 'Hair Removal'
    WHEN 'soins_visage' THEN 'Facial Care'
    WHEN 'soins_corps' THEN 'Body Care'
    WHEN 'extensions' THEN 'Extensions'
    WHEN 'tresses' THEN 'Braids'
    WHEN 'defrisage' THEN 'Relaxing'
    WHEN 'coloration' THEN 'Coloring'
    WHEN 'barbe' THEN 'Beard'
    ELSE code
  END as name,
  NULL as description
FROM service_categories;


-- ÉTAPE 4: Supprimer les anciennes colonnes
-- ===========================================

-- Supprimer les colonnes de business_types
ALTER TABLE business_types 
DROP COLUMN label,
DROP COLUMN description;

-- Supprimer les colonnes de service_categories
ALTER TABLE service_categories 
DROP COLUMN name;


-- ÉTAPE 5: Vérifications
-- =======================

-- Vérifier business_types
SELECT 
  'business_types' as table_name,
  COUNT(*) as total_types,
  (SELECT COUNT(DISTINCT business_type_id) FROM business_type_translations) as types_with_translations,
  (SELECT COUNT(*) FROM business_type_translations WHERE locale = 'fr') as fr_translations,
  (SELECT COUNT(*) FROM business_type_translations WHERE locale = 'en') as en_translations;

-- Vérifier service_categories
SELECT 
  'service_categories' as table_name,
  COUNT(*) as total_categories,
  (SELECT COUNT(DISTINCT category_id) FROM service_category_translations) as categories_with_translations,
  (SELECT COUNT(*) FROM service_category_translations WHERE locale = 'fr') as fr_translations,
  (SELECT COUNT(*) FROM service_category_translations WHERE locale = 'en') as en_translations;

-- Afficher un exemple de chaque
SELECT 
  bt.id,
  bt.code,
  bt.icon,
  GROUP_CONCAT(CONCAT(btt.locale, ': ', btt.label) SEPARATOR ' | ') as translations
FROM business_types bt
LEFT JOIN business_type_translations btt ON bt.id = btt.business_type_id
GROUP BY bt.id
LIMIT 3;

SELECT 
  sc.id,
  sc.code,
  sc.icon,
  GROUP_CONCAT(CONCAT(sct.locale, ': ', sct.name) SEPARATOR ' | ') as translations
FROM service_categories sc
LEFT JOIN service_category_translations sct ON sc.id = sct.category_id
GROUP BY sc.id
LIMIT 3;
