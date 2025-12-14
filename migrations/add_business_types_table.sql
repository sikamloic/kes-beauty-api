-- =============================================================================
-- Migration: Ajout de la table business_types et relation avec provider_profiles
-- Date: 2025-12-05
-- Description: 
--   - Crée la table business_types pour les types de business des providers
--   - Ajoute la colonne business_type_id (nullable) dans provider_profiles
--   - Insère les données de référence
-- =============================================================================

-- 1. Créer la table business_types
CREATE TABLE business_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'Code unique du type (ex: freelance, salon)',
  label VARCHAR(100) NOT NULL COMMENT 'Libellé affiché',
  description TEXT COMMENT 'Description détaillée',
  icon VARCHAR(50) COMMENT 'Nom de l''icône (ex: user, scissors)',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Type actif ou désactivé',
  display_order INT DEFAULT 0 COMMENT 'Ordre d''affichage',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Types de business pour les providers';

-- 2. Insérer les données de référence
INSERT INTO business_types (code, label, description, icon, display_order) VALUES
('freelance', 'A mon compte (freelance)', 'Je travaille seul(e) a mon compte', 'user', 1),
('salon', 'Gerant d''un salon', 'Je gere un salon avec des employes', 'scissors', 2),
('institut', 'Gerant d''un institut', 'Je gere un institut de beaute', 'sparkles', 3),
('spa', 'Gerant d''un spa', 'Je gere un spa ou centre de bien-etre', 'spa', 4),
('coworking', 'Gerant d''un coworking', 'Je loue des espaces a d''autres professionnels', 'building', 5),
('student', 'Etudiant', 'Je suis en formation, tarifs reduits', 'graduation-cap', 6),
('employee', 'Salarie', 'Je suis salarie(e) d''un etablissement', 'briefcase', 7),
('enterprise', 'Entreprise', 'Structure B2B pour evenements et marques', 'building-2', 8);

-- 3. Ajouter la colonne business_type_id dans provider_profiles
ALTER TABLE provider_profiles 
ADD COLUMN business_type_id INT NULL COMMENT 'FK vers business_types, renseigné lors de la mise à jour du profil',
ADD CONSTRAINT fk_provider_business_type 
  FOREIGN KEY (business_type_id) 
  REFERENCES business_types(id)
  ON DELETE RESTRICT
  ON UPDATE CASCADE,
ADD INDEX idx_business_type (business_type_id);

-- 4. Vérification
SELECT 'business_types créée avec succès' AS status, COUNT(*) AS count FROM business_types;
SELECT 'Colonne business_type_id ajoutée' AS status FROM provider_profiles LIMIT 1;
