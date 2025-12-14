-- Migration: Ajouter table refresh_tokens
-- Date: 2024-11-24
-- Description: Stockage des refresh tokens JWT pour sécurité et révocation

-- Créer table refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Token
  token VARCHAR(500) UNIQUE NOT NULL COMMENT 'JWT refresh token',
  user_id INT NOT NULL,
  
  -- Métadonnées
  device_info VARCHAR(255) COMMENT 'User-Agent du client',
  ip_address VARCHAR(45) COMMENT 'IPv4 ou IPv6',
  
  -- Dates
  expires_at TIMESTAMP NOT NULL COMMENT 'Date expiration (7 jours)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Dernière utilisation',
  
  -- Révocation
  is_revoked BOOLEAN DEFAULT FALSE COMMENT 'Token révoqué (logout)',
  revoked_at TIMESTAMP NULL COMMENT 'Date de révocation',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked (is_revoked, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stockage refresh tokens pour révocation et gestion sessions';
