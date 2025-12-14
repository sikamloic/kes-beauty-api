-- Migration: Ajouter soft delete aux spécialités provider
-- Date: 2024-12-03
-- Description: Ajoute le champ deleted_at pour permettre le soft delete des spécialités

-- Ajouter colonne deleted_at
ALTER TABLE provider_specialties
ADD COLUMN deleted_at TIMESTAMP NULL AFTER created_at;

-- Ajouter index pour améliorer les performances des requêtes filtrant les supprimés
CREATE INDEX idx_deleted_at ON provider_specialties(deleted_at);

-- Commentaire
ALTER TABLE provider_specialties 
MODIFY COLUMN deleted_at TIMESTAMP NULL COMMENT 'Date de suppression (soft delete)';
