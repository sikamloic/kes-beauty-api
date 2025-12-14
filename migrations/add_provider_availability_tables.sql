-- Migration: Ajouter tables de disponibilités provider
-- Date: 2024-12-04
-- Description: Crée les tables pour gérer les horaires réguliers et les exceptions

-- Table des horaires réguliers hebdomadaires
CREATE TABLE provider_availabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL COMMENT 'FK vers provider_profiles',
  day_of_week INT NOT NULL COMMENT '0=Dimanche, 1=Lundi, ..., 6=Samedi',
  start_time VARCHAR(5) NOT NULL COMMENT 'Format HH:mm (ex: 09:00)',
  end_time VARCHAR(5) NOT NULL COMMENT 'Format HH:mm (ex: 17:00)',
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Activer/désactiver ce créneau',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_provider_day_time (provider_id, day_of_week, start_time),
  INDEX idx_provider_day_active (provider_id, day_of_week, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Horaires réguliers hebdomadaires des providers';

-- Table des exceptions aux horaires réguliers
CREATE TABLE provider_availability_exceptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL COMMENT 'FK vers provider_profiles',
  date DATE NOT NULL COMMENT 'Date de l\'exception',
  type VARCHAR(20) NOT NULL COMMENT 'unavailable ou custom_hours',
  start_time VARCHAR(5) NULL COMMENT 'Heure début si custom_hours',
  end_time VARCHAR(5) NULL COMMENT 'Heure fin si custom_hours',
  reason VARCHAR(255) NULL COMMENT 'Raison de l\'exception (optionnel)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_provider_date (provider_id, date),
  INDEX idx_provider_date (provider_id, date),
  INDEX idx_date_type (date, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Exceptions aux horaires réguliers (congés, horaires spéciaux)';
