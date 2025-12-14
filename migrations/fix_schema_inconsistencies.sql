-- =============================================================================
-- Migration: Correction des incohérences entre Prisma et SQL
-- Date: 2025-12-07
-- Description: 
--   - Ajuster la taille de la colonne icon dans service_categories
--   - Ajouter l'index manquant sur (is_active, display_order)
-- =============================================================================

-- 1. Modifier la colonne icon de service_categories (255 → 50)
ALTER TABLE service_categories 
MODIFY COLUMN icon VARCHAR(50) COMMENT 'Nom de l''icône';

-- 2. Ajouter l'index manquant sur (is_active, display_order)
-- Vérifier d'abord si l'index existe déjà
DROP INDEX IF EXISTS idx_active_order ON service_categories;

CREATE INDEX idx_active_order ON service_categories(is_active, display_order);

-- 3. Vérification
SHOW CREATE TABLE service_categories;

SELECT 
  'service_categories' as table_name,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'service_categories'
  AND COLUMN_NAME IN ('icon', 'is_active', 'display_order');

SELECT 
  'Indexes' as info,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') as columns
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'service_categories'
GROUP BY INDEX_NAME;
