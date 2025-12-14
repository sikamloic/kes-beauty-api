-- Migration: Ajouter table provider_specialties
-- Date: 2024-12-03
-- Description: Spécialités des providers (compétences/domaines d'expertise)

CREATE TABLE IF NOT EXISTS provider_specialties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL COMMENT 'FK vers provider_profiles',
    category_id INT NOT NULL COMMENT 'FK vers service_categories',
    years_experience INT NOT NULL DEFAULT 0 COMMENT 'Années d\'expérience dans cette spécialité',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Spécialité principale du provider',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_category (provider_id, category_id),
    INDEX idx_category_primary (category_id, is_primary),
    INDEX idx_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Spécialités et compétences des providers';
