-- Migration: Ajouter table OTP générique
-- Date: 2024-11-25
-- Description: Table universelle pour tous types de codes OTP (SMS, email, password reset, MFA)

-- Créer la table otps
CREATE TABLE IF NOT EXISTS otps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL COMMENT 'phone, email, userId, etc.',
    code VARCHAR(10) NOT NULL COMMENT 'Code OTP',
    type VARCHAR(50) NOT NULL COMMENT 'phone_verification, email_verification, password_reset, mfa',
    expires_at DATETIME NOT NULL COMMENT 'Date expiration du code',
    attempts INT NOT NULL DEFAULT 0 COMMENT 'Nombre de tentatives',
    is_used BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Code déjà utilisé',
    used_at DATETIME NULL COMMENT 'Date utilisation',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    UNIQUE KEY unique_identifier_type (identifier, type),
    INDEX idx_identifier_type (identifier, type),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Codes OTP universels pour vérifications et authentification';
