-- =============================================================================
-- Seed: Business Types et Service Categories avec traductions
-- Date: 2025-12-07
-- Description: 
--   - Insère les business_types avec traductions FR/EN
--   - Insère les service_categories avec traductions FR/EN
--   - Données propres et complètes
-- =============================================================================

-- Vider les tables (ordre FK inverse)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE business_type_translations;
TRUNCATE TABLE business_types;
TRUNCATE TABLE service_category_translations;
TRUNCATE TABLE service_categories;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- BUSINESS TYPES
-- =============================================================================

-- Insérer les business_types
INSERT INTO business_types (id, code, icon, is_active, display_order) VALUES
(1, 'freelance', 'user', TRUE, 1),
(2, 'salon', 'scissors', TRUE, 2),
(3, 'institut', 'sparkles', TRUE, 3),
(4, 'spa', 'spa', TRUE, 4),
(5, 'coworking', 'building', TRUE, 5),
(6, 'student', 'graduation-cap', TRUE, 6),
(7, 'employee', 'briefcase', TRUE, 7),
(8, 'enterprise', 'building-2', TRUE, 8);

-- Traductions FR
INSERT INTO business_type_translations (business_type_id, locale, label, description) VALUES
(1, 'fr', 'A mon compte (freelance)', 'Je travaille seul(e) a mon compte'),
(2, 'fr', 'Gerant d''un salon', 'Je gere un salon avec des employes'),
(3, 'fr', 'Gerant d''un institut', 'Je gere un institut de beaute'),
(4, 'fr', 'Gerant d''un spa', 'Je gere un spa ou centre de bien-etre'),
(5, 'fr', 'Gerant d''un coworking', 'Je loue des espaces a d''autres professionnels'),
(6, 'fr', 'Etudiant', 'Je suis en formation, tarifs reduits'),
(7, 'fr', 'Salarie', 'Je suis salarie(e) d''un etablissement'),
(8, 'fr', 'Entreprise', 'Structure B2B pour evenements et marques');

-- Traductions EN
INSERT INTO business_type_translations (business_type_id, locale, label, description) VALUES
(1, 'en', 'Freelance', 'I work independently on my own'),
(2, 'en', 'Salon Manager', 'I manage a salon with employees'),
(3, 'en', 'Institute Manager', 'I manage a beauty institute'),
(4, 'en', 'Spa Manager', 'I manage a spa or wellness center'),
(5, 'en', 'Coworking Manager', 'I rent spaces to other professionals'),
(6, 'en', 'Student', 'I am in training, reduced rates'),
(7, 'en', 'Employee', 'I am an employee of an establishment'),
(8, 'en', 'Enterprise', 'B2B structure for events and brands');

-- =============================================================================
-- SERVICE CATEGORIES
-- =============================================================================

-- Catégories principales
INSERT INTO service_categories (id, code, icon, parent_id, is_active, display_order) VALUES
(1, 'coiffure', 'scissors', NULL, TRUE, 1),
(2, 'esthetique', 'spa', NULL, TRUE, 2),
(3, 'manucure', 'hand', NULL, TRUE, 3),
(4, 'massage', 'massage', NULL, TRUE, 4),
(5, 'maquillage', 'palette', NULL, TRUE, 5);

-- Sous-catégories
INSERT INTO service_categories (id, code, icon, parent_id, is_active, display_order) VALUES
(6, 'coiffure_afro', 'scissors', 1, TRUE, 1),
(7, 'coiffure_lisse', 'scissors', 1, TRUE, 2),
(8, 'coiffure_enfant', 'scissors', 1, TRUE, 3),
(9, 'soin_visage', 'spa', 2, TRUE, 1),
(10, 'epilation', 'spa', 2, TRUE, 2);

-- Traductions FR - Catégories principales
INSERT INTO service_category_translations (category_id, locale, name, description) VALUES
(1, 'fr', 'Coiffure', NULL),
(2, 'fr', 'Esthétique', NULL),
(3, 'fr', 'Manucure & Pédicure', NULL),
(4, 'fr', 'Massage', NULL),
(5, 'fr', 'Maquillage', NULL);

-- Traductions FR - Sous-catégories
INSERT INTO service_category_translations (category_id, locale, name, description) VALUES
(6, 'fr', 'Cheveux Afro', NULL),
(7, 'fr', 'Cheveux Lisses', NULL),
(8, 'fr', 'Coiffure Enfant', NULL),
(9, 'fr', 'Soins du Visage', NULL),
(10, 'fr', 'Épilation', NULL);

-- Traductions EN - Catégories principales
INSERT INTO service_category_translations (category_id, locale, name, description) VALUES
(1, 'en', 'Hair Styling', NULL),
(2, 'en', 'Aesthetics', NULL),
(3, 'en', 'Manicure & Pedicure', NULL),
(4, 'en', 'Massage', NULL),
(5, 'en', 'Makeup', NULL);

-- Traductions EN - Sous-catégories
INSERT INTO service_category_translations (category_id, locale, name, description) VALUES
(6, 'en', 'Afro Hair', NULL),
(7, 'en', 'Straight Hair', NULL),
(8, 'en', 'Children Haircut', NULL),
(9, 'en', 'Facial Care', NULL),
(10, 'en', 'Hair Removal', NULL);

-- =============================================================================
-- VÉRIFICATIONS
-- =============================================================================

-- Vérifier business_types
SELECT 
  'business_types' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active
FROM business_types;

-- Vérifier business_type_translations
SELECT 
  'business_type_translations' as table_name,
  locale,
  COUNT(*) as count
FROM business_type_translations
GROUP BY locale;

-- Vérifier service_categories
SELECT 
  'service_categories' as table_name,
  COUNT(*) as total,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as main_categories,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as sub_categories
FROM service_categories;

-- Vérifier service_category_translations
SELECT 
  'service_category_translations' as table_name,
  locale,
  COUNT(*) as count
FROM service_category_translations
GROUP BY locale;

-- Afficher un exemple complet
SELECT 
  bt.id,
  bt.code,
  bt.icon,
  GROUP_CONCAT(
    CONCAT(btt.locale, ': ', btt.label) 
    ORDER BY btt.locale 
    SEPARATOR ' | '
  ) as translations
FROM business_types bt
LEFT JOIN business_type_translations btt ON bt.id = btt.business_type_id
GROUP BY bt.id, bt.code, bt.icon
ORDER BY bt.display_order;

SELECT 
  sc.id,
  sc.code,
  sc.icon,
  CASE WHEN sc.parent_id IS NULL THEN 'Main' ELSE 'Sub' END as type,
  GROUP_CONCAT(
    CONCAT(sct.locale, ': ', sct.name) 
    ORDER BY sct.locale 
    SEPARATOR ' | '
  ) as translations
FROM service_categories sc
LEFT JOIN service_category_translations sct ON sc.id = sct.category_id
GROUP BY sc.id, sc.code, sc.icon, sc.parent_id
ORDER BY sc.parent_id IS NULL DESC, sc.display_order;
