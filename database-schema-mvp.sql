-- ==============================================
-- BEAUTY PLATFORM - MVP DATABASE SCHEMA
-- MySQL 8.0+
-- ==============================================

-- Suppression des tables existantes (ordre inverse des FK)
DROP TABLE IF EXISTS payment_attempts;
DROP TABLE IF EXISTS payment_gateway_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS appointment_cancellations;
DROP TABLE IF EXISTS appointment_confirmations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS provider_schedule_exceptions;
DROP TABLE IF EXISTS provider_availability_exceptions;
DROP TABLE IF EXISTS provider_availabilities;
DROP TABLE IF EXISTS provider_schedules;
DROP TABLE IF EXISTS provider_service_settings;
DROP TABLE IF EXISTS provider_verifications;
DROP TABLE IF EXISTS provider_statistics;
DROP TABLE IF EXISTS provider_profiles;
DROP TABLE IF EXISTS client_profiles;
DROP TABLE IF EXISTS provider_specialties;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_category_translations;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS business_type_translations;
DROP TABLE IF EXISTS business_types;
DROP TABLE IF EXISTS payment_methods;
DROP TABLE IF EXISTS otps;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;

-- ==============================================
-- 1. USERS - Table centrale authentification
-- ==============================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Authentification
  phone VARCHAR(20) UNIQUE NOT NULL COMMENT 'Format: +237XXXXXXXXX',
  email VARCHAR(191) UNIQUE COMMENT 'Email optionnel',
  password_hash VARCHAR(255) NOT NULL,
  
  -- Vérification
  phone_verified_at TIMESTAMP NULL,
  email_verified_at TIMESTAMP NULL,
  
  -- Sécurité
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Soft delete pour RGPD',
  
  INDEX idx_phone (phone),
  INDEX idx_email (email),
  INDEX idx_active (is_active, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 2. ROLES - Table de référence (OCP)
-- ==============================================
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'client, provider, admin',
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 3. USER_ROLES - Rôles multiples par user
-- ==============================================
CREATE TABLE user_roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL COMMENT 'FK vers roles (OCP)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_user_role (user_id, role_id),
  INDEX idx_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 4. REFRESH_TOKENS - Tokens JWT (Sécurité)
-- ==============================================
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Token (stocké en hash SHA-256 pour sécurité)
  token_hash VARCHAR(64) UNIQUE NOT NULL COMMENT 'SHA-256 hash du refresh token',
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
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked (is_revoked, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stockage refresh tokens pour révocation et gestion sessions';

-- ==============================================
-- 5. OTPS - Codes OTP universels
-- ==============================================
CREATE TABLE otps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Identification
  identifier VARCHAR(100) NOT NULL COMMENT 'phone, email, userId, etc.',
  code VARCHAR(10) NOT NULL COMMENT 'Code OTP',
  type VARCHAR(30) NOT NULL COMMENT 'phone_verification, email_verification, password_reset, mfa',
  
  -- Expiration et sécurité
  expires_at DATETIME NOT NULL COMMENT 'Date expiration du code',
  attempts INT NOT NULL DEFAULT 0 COMMENT 'Nombre de tentatives',
  is_used BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Code déjà utilisé',
  used_at DATETIME NULL COMMENT 'Date utilisation',
  
  -- Audit
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_identifier_type (identifier, type),
  INDEX idx_identifier_type (identifier, type),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Codes OTP universels pour vérifications et authentification';

-- ==============================================
-- 6. CLIENT_PROFILES - Profils clients (LSP)
-- ==============================================
CREATE TABLE client_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  preferences JSON COMMENT 'Type cheveux, budget, etc.',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 7. PROVIDER_PROFILES - Profils prestataires (SRP)
-- ==============================================
CREATE TABLE provider_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  business_type_id INT NULL COMMENT 'FK vers business_types',
  business_name VARCHAR(255),
  bio TEXT,
  years_experience INT DEFAULT 0,
  address TEXT,
  city VARCHAR(100) NOT NULL COMMENT 'Douala, Yaoundé, etc.',
  neighborhood VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (business_type_id) REFERENCES business_types(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_business_type (business_type_id),
  INDEX idx_location (city, neighborhood),
  INDEX idx_coordinates (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 8. PROVIDER_SERVICE_SETTINGS - Config services (SRP)
-- ==============================================
CREATE TABLE provider_service_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT UNIQUE NOT NULL,
  offers_home_service BOOLEAN DEFAULT FALSE,
  home_service_radius_km INT DEFAULT 0,
  auto_accept_bookings BOOLEAN DEFAULT FALSE,
  booking_advance_days INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  INDEX idx_provider (provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 9. PROVIDER_VERIFICATIONS - Validation workflow (SRP)
-- ==============================================
CREATE TABLE provider_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, approved, rejected, suspended',
  verified_by_user_id INT NULL,
  verified_at TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_provider (provider_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 10. PROVIDER_STATISTICS - Métriques (SRP)
-- ==============================================
CREATE TABLE provider_statistics (
  provider_id INT PRIMARY KEY,
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  total_cancelled INT DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  INDEX idx_rating (average_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 11. BUSINESS_TYPES - Types de business (OCP)
-- ==============================================
CREATE TABLE business_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'freelance, salon, institut, etc.',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 12. BUSINESS_TYPE_TRANSLATIONS - Traductions types business (i18n)
-- ==============================================
CREATE TABLE business_type_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  business_type_id INT NOT NULL,
  locale VARCHAR(5) NOT NULL COMMENT 'fr, en, etc.',
  label VARCHAR(100) NOT NULL,
  description TEXT,
  
  UNIQUE KEY unique_translation (business_type_id, locale),
  FOREIGN KEY (business_type_id) REFERENCES business_types(id) ON DELETE CASCADE,
  INDEX idx_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 13. SERVICE_CATEGORIES - Catégories services (OCP)
-- ==============================================
CREATE TABLE service_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'coiffure, esthetique, etc.',
  parent_id INT NULL COMMENT 'Pour sous-catégories',
  icon VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES service_categories(id) ON DELETE SET NULL,
  INDEX idx_code (code),
  INDEX idx_parent (parent_id),
  INDEX idx_active (is_active),
  INDEX idx_active_order (is_active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 14. SERVICE_CATEGORY_TRANSLATIONS - Traductions catégories (i18n)
-- ==============================================
CREATE TABLE service_category_translations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category_id INT NOT NULL,
  locale VARCHAR(5) NOT NULL COMMENT 'fr, en, etc.',
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  UNIQUE KEY unique_translation (category_id, locale),
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
  INDEX idx_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 12. SERVICES - Catalogue services
-- ==============================================
CREATE TABLE services (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  category_id INT NOT NULL COMMENT 'FK vers service_categories (OCP)',
  
  -- Informations
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Prix
  price_fcfa INT NOT NULL,
  price_type VARCHAR(50) DEFAULT 'fixed' COMMENT 'fixed, from, negotiable',
  
  -- Durée
  duration_minutes INT NOT NULL,
  buffer_time_minutes INT DEFAULT 0 COMMENT 'Temps entre rendez-vous',
  
  -- Disponibilité
  is_active BOOLEAN DEFAULT TRUE,
  requires_deposit BOOLEAN DEFAULT FALSE,
  deposit_percentage INT DEFAULT 0 COMMENT 'Pourcentage acompte',
  
  -- Métriques
  booking_count INT DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT,
  
  INDEX idx_provider (provider_id, is_active),
  INDEX idx_category (category_id, is_active),
  INDEX idx_price (price_fcfa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 13. PROVIDER_SPECIALTIES - Spécialités/Compétences
-- ==============================================
CREATE TABLE provider_specialties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL COMMENT 'FK vers provider_profiles',
  category_id INT NOT NULL COMMENT 'FK vers service_categories',
  
  -- Expertise
  years_experience INT NOT NULL DEFAULT 0 COMMENT "Années d'expérience dans cette spécialité",
  is_primary BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Spécialité principale (une seule autorisée)',
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT 'Date de suppression (soft delete)',
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_provider_category (provider_id, category_id),
  INDEX idx_category_primary (category_id, is_primary),
  INDEX idx_provider (provider_id),
  INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT="Spécialités et domaines d'expertise des providers";

-- ==============================================
-- 14. PROVIDER_AVAILABILITIES - Disponibilités flexibles par date
-- ==============================================
CREATE TABLE provider_availabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL COMMENT 'FK vers provider_profiles',
  date DATE NOT NULL COMMENT 'Date spécifique (YYYY-MM-DD)',
  start_time VARCHAR(5) NOT NULL COMMENT 'Format HH:mm (ex: 09:35)',
  end_time VARCHAR(5) NOT NULL COMMENT 'Format HH:mm (ex: 11:49)',
  is_available BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'true=disponible, false=bloqué',
  reason VARCHAR(255) NULL COMMENT 'Raison optionnelle (congé, formation, etc.)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  
  -- Un seul créneau par provider/date/heure de début (chevauchement géré par l'application)
  UNIQUE KEY unique_provider_date_time (provider_id, date, start_time),
  INDEX idx_provider_date (provider_id, date),
  INDEX idx_date_available (date, is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT="Disponibilités flexibles par date - plusieurs créneaux possibles par jour";

-- ==============================================
-- 16. APPOINTMENTS - Réservations core (ISP)
-- ==============================================
CREATE TABLE appointments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  provider_id INT NOT NULL,
  service_id INT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  duration_minutes INT NOT NULL,
  end_at TIMESTAMP GENERATED ALWAYS AS (scheduled_at + INTERVAL duration_minutes MINUTE) STORED,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending, confirmed, in_progress, completed, cancelled, no_show',
  price_fcfa INT NOT NULL,
  deposit_fcfa INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_provider_slot (provider_id, scheduled_at),
  INDEX idx_client (client_id, status),
  INDEX idx_provider (provider_id, status),
  INDEX idx_scheduled (scheduled_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 17. APPOINTMENT_CONFIRMATIONS - Confirmations (ISP)
-- ==============================================
CREATE TABLE appointment_confirmations (
  appointment_id INT PRIMARY KEY,
  confirmed_at TIMESTAMP NOT NULL,
  confirmed_by_user_id INT NOT NULL,
  
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 18. APPOINTMENT_CANCELLATIONS - Annulations (ISP)
-- ==============================================
CREATE TABLE appointment_cancellations (
  appointment_id INT PRIMARY KEY,
  cancelled_at TIMESTAMP NOT NULL,
  cancelled_by_user_id INT NOT NULL,
  cancellation_reason TEXT,
  cancellation_type VARCHAR(50) COMMENT 'client, provider, admin, system',
  
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (cancelled_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 19. PAYMENT_METHODS - Méthodes paiement (OCP/DIP)
-- ==============================================
CREATE TABLE payment_methods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL COMMENT 'orange_money, mtn_money, cash',
  name VARCHAR(100) NOT NULL,
  provider VARCHAR(100) COMMENT 'Orange, MTN, etc.',
  is_active BOOLEAN DEFAULT TRUE,
  config JSON NULL COMMENT 'Configuration spécifique gateway',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_code (code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 20. PAYMENTS - Transactions (DIP)
-- ==============================================
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT UNIQUE NOT NULL,
  user_id INT NOT NULL,
  payment_method_id INT NOT NULL COMMENT 'FK vers payment_methods (DIP)',
  amount_fcfa INT NOT NULL,
  provider_amount_fcfa INT NOT NULL,
  platform_commission_fcfa INT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, processing, completed, failed, refunded',
  internal_reference VARCHAR(100) UNIQUE,
  payer_phone VARCHAR(20),
  refunded_amount_fcfa INT DEFAULT 0,
  refund_reason TEXT NULL,
  refunded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  INDEX idx_appointment (appointment_id),
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 21. PAYMENT_GATEWAY_TRANSACTIONS - Détails gateway (DIP)
-- ==============================================
CREATE TABLE payment_gateway_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL,
  external_transaction_id VARCHAR(255) UNIQUE COMMENT 'ID Orange/MTN (IDEMPOTENCE)',
  gateway_response JSON NULL,
  webhook_received_at TIMESTAMP NULL,
  webhook_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_payment (payment_id),
  INDEX idx_external_id (external_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 22. PAYMENT_ATTEMPTS - Historique tentatives
-- ==============================================
CREATE TABLE payment_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_id INT NOT NULL,
  attempt_number INT NOT NULL,
  status VARCHAR(50) NOT NULL COMMENT 'initiated, success, failed',
  error_code VARCHAR(50) NULL,
  error_message TEXT NULL,
  gateway_response JSON NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_payment (payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- 20. REVIEWS - Avis clients
-- ==============================================
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT UNIQUE NOT NULL,
  client_id INT NOT NULL,
  provider_id INT NOT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  quality_rating TINYINT NULL CHECK (quality_rating BETWEEN 1 AND 5),
  punctuality_rating TINYINT NULL CHECK (punctuality_rating BETWEEN 1 AND 5),
  hospitality_rating TINYINT NULL CHECK (hospitality_rating BETWEEN 1 AND 5),
  value_rating TINYINT NULL CHECK (value_rating BETWEEN 1 AND 5),
  is_verified BOOLEAN DEFAULT TRUE,
  is_visible BOOLEAN DEFAULT TRUE,
  moderation_status VARCHAR(50) DEFAULT 'approved' COMMENT 'pending, approved, rejected',
  moderation_reason TEXT NULL,
  moderated_by_user_id INT NULL,
  moderated_at TIMESTAMP NULL,
  provider_response TEXT NULL,
  provider_responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (moderated_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_appointment (appointment_id),
  INDEX idx_client (client_id),
  INDEX idx_provider (provider_id, is_visible),
  INDEX idx_rating (rating),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TRIGGERS - Mise à jour métriques automatique
-- ==============================================

-- ==============================================
-- TRIGGERS - Mise à jour métriques (SRP)
-- ==============================================

-- Trigger: Mise à jour statistics provider après insert review
DELIMITER $$
CREATE TRIGGER after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
  INSERT INTO provider_statistics (provider_id, average_rating, total_reviews)
  VALUES (NEW.provider_id, NEW.rating, 1)
  ON DUPLICATE KEY UPDATE
    average_rating = (
      SELECT AVG(rating) FROM reviews 
      WHERE provider_id = NEW.provider_id AND is_visible = TRUE AND deleted_at IS NULL
    ),
    total_reviews = (
      SELECT COUNT(*) FROM reviews 
      WHERE provider_id = NEW.provider_id AND is_visible = TRUE AND deleted_at IS NULL
    );
END$$
DELIMITER ;

-- Trigger: Mise à jour statistics provider après update review
DELIMITER $$
CREATE TRIGGER after_review_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
  UPDATE provider_statistics
  SET 
    average_rating = (
      SELECT AVG(rating) FROM reviews 
      WHERE provider_id = NEW.provider_id AND is_visible = TRUE AND deleted_at IS NULL
    ),
    total_reviews = (
      SELECT COUNT(*) FROM reviews 
      WHERE provider_id = NEW.provider_id AND is_visible = TRUE AND deleted_at IS NULL
    )
  WHERE provider_id = NEW.provider_id;
END$$
DELIMITER ;

-- Trigger: Incrémenter statistics après confirmation
DELIMITER $$
CREATE TRIGGER after_appointment_confirmed
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    UPDATE services SET booking_count = booking_count + 1 WHERE id = NEW.service_id;
    INSERT INTO provider_statistics (provider_id, total_bookings) VALUES (NEW.provider_id, 1)
    ON DUPLICATE KEY UPDATE total_bookings = total_bookings + 1;
  END IF;
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE provider_statistics SET total_completed = total_completed + 1 WHERE provider_id = NEW.provider_id;
  END IF;
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE provider_statistics SET total_cancelled = total_cancelled + 1 WHERE provider_id = NEW.provider_id;
  END IF;
END$$
DELIMITER ;

-- ==============================================
-- DONNÉES INITIALES (SEED) - SOLID
-- ==============================================

-- Rôles (OCP)
INSERT INTO roles (code, name, description) VALUES
('client', 'Client', 'Utilisateur final de la plateforme'),
('provider', 'Prestataire', 'Fournisseur de services beauté'),
('admin', 'Administrateur', 'Administrateur de la plateforme');

-- Admin par défaut (password: Admin@123)
INSERT INTO users (phone, email, password_hash, phone_verified_at, is_active) VALUES
('+237600000000', 'admin@beautyplatform.cm', '$2b$10$rGHvQZ8YxZ8YxZ8YxZ8YxOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', NOW(), TRUE);

INSERT INTO user_roles (user_id, role_id) VALUES
(1, (SELECT id FROM roles WHERE code = 'admin'));

-- Types de business
INSERT INTO business_types (code, icon, display_order) VALUES
('freelance', 'user', 1),
('salon', 'scissors', 2),
('institut', 'sparkles', 3),
('spa', 'spa', 4),
('coworking', 'building', 5),
('student', 'graduation-cap', 6),
('employee', 'briefcase', 7),
('enterprise', 'building-2', 8);

-- Traductions business_types (FR)
INSERT INTO business_type_translations (business_type_id, locale, label, description) VALUES
((SELECT id FROM business_types WHERE code = 'freelance'), 'fr', 'A mon compte (freelance)', 'Je travaille seul(e) a mon compte'),
((SELECT id FROM business_types WHERE code = 'salon'), 'fr', 'Gerant d''un salon', 'Je gere un salon avec des employes'),
((SELECT id FROM business_types WHERE code = 'institut'), 'fr', 'Gerant d''un institut', 'Je gere un institut de beaute'),
((SELECT id FROM business_types WHERE code = 'spa'), 'fr', 'Gerant d''un spa', 'Je gere un spa ou centre de bien-etre'),
((SELECT id FROM business_types WHERE code = 'coworking'), 'fr', 'Gerant d''un coworking', 'Je loue des espaces a d''autres professionnels'),
((SELECT id FROM business_types WHERE code = 'student'), 'fr', 'Etudiant', 'Je suis en formation, tarifs reduits'),
((SELECT id FROM business_types WHERE code = 'employee'), 'fr', 'Salarie', 'Je suis salarie(e) d''un etablissement'),
((SELECT id FROM business_types WHERE code = 'enterprise'), 'fr', 'Entreprise', 'Structure B2B pour evenements et marques');

-- Traductions business_types (EN)
INSERT INTO business_type_translations (business_type_id, locale, label, description) VALUES
((SELECT id FROM business_types WHERE code = 'freelance'), 'en', 'Freelance', 'I work independently on my own'),
((SELECT id FROM business_types WHERE code = 'salon'), 'en', 'Salon Manager', 'I manage a salon with employees'),
((SELECT id FROM business_types WHERE code = 'institut'), 'en', 'Institute Manager', 'I manage a beauty institute'),
((SELECT id FROM business_types WHERE code = 'spa'), 'en', 'Spa Manager', 'I manage a spa or wellness center'),
((SELECT id FROM business_types WHERE code = 'coworking'), 'en', 'Coworking Manager', 'I rent spaces to other professionals'),
((SELECT id FROM business_types WHERE code = 'student'), 'en', 'Student', 'I am in training, reduced rates'),
((SELECT id FROM business_types WHERE code = 'employee'), 'en', 'Employee', 'I am an employee of an establishment'),
((SELECT id FROM business_types WHERE code = 'enterprise'), 'en', 'Enterprise', 'B2B structure for events and brands');

-- Catégories de services (OCP)
INSERT INTO service_categories (code, icon, display_order) VALUES
('coiffure', 'scissors', 1),
('esthetique', 'spa', 2),
('manucure', 'hand', 3),
('massage', 'massage', 4),
('maquillage', 'palette', 5);

-- Sous-catégories (avec variables pour éviter erreur MySQL #1093)
SET @coiffure_id = (SELECT id FROM service_categories WHERE code = 'coiffure');
SET @esthetique_id = (SELECT id FROM service_categories WHERE code = 'esthetique');

INSERT INTO service_categories (code, parent_id, display_order) VALUES
('coiffure_afro', @coiffure_id, 1),
('coiffure_lisse', @coiffure_id, 2),
('coiffure_enfant', @coiffure_id, 3),
('soin_visage', @esthetique_id, 1),
('epilation', @esthetique_id, 2);

-- Traductions service_categories (FR)
INSERT INTO service_category_translations (category_id, locale, name) VALUES
((SELECT id FROM service_categories WHERE code = 'coiffure'), 'fr', 'Coiffure'),
((SELECT id FROM service_categories WHERE code = 'esthetique'), 'fr', 'Esthétique'),
((SELECT id FROM service_categories WHERE code = 'manucure'), 'fr', 'Manucure & Pédicure'),
((SELECT id FROM service_categories WHERE code = 'massage'), 'fr', 'Massage'),
((SELECT id FROM service_categories WHERE code = 'maquillage'), 'fr', 'Maquillage'),
((SELECT id FROM service_categories WHERE code = 'coiffure_afro'), 'fr', 'Cheveux Afro'),
((SELECT id FROM service_categories WHERE code = 'coiffure_lisse'), 'fr', 'Cheveux Lisses'),
((SELECT id FROM service_categories WHERE code = 'coiffure_enfant'), 'fr', 'Coiffure Enfant'),
((SELECT id FROM service_categories WHERE code = 'soin_visage'), 'fr', 'Soins du Visage'),
((SELECT id FROM service_categories WHERE code = 'epilation'), 'fr', 'Épilation');

-- Traductions service_categories (EN)
INSERT INTO service_category_translations (category_id, locale, name) VALUES
((SELECT id FROM service_categories WHERE code = 'coiffure'), 'en', 'Hair Styling'),
((SELECT id FROM service_categories WHERE code = 'esthetique'), 'en', 'Aesthetics'),
((SELECT id FROM service_categories WHERE code = 'manucure'), 'en', 'Manicure & Pedicure'),
((SELECT id FROM service_categories WHERE code = 'massage'), 'en', 'Massage'),
((SELECT id FROM service_categories WHERE code = 'maquillage'), 'en', 'Makeup'),
((SELECT id FROM service_categories WHERE code = 'coiffure_afro'), 'en', 'Afro Hair'),
((SELECT id FROM service_categories WHERE code = 'coiffure_lisse'), 'en', 'Straight Hair'),
((SELECT id FROM service_categories WHERE code = 'coiffure_enfant'), 'en', 'Children Haircut'),
((SELECT id FROM service_categories WHERE code = 'soin_visage'), 'en', 'Facial Care'),
((SELECT id FROM service_categories WHERE code = 'epilation'), 'en', 'Hair Removal');

-- Méthodes de paiement (OCP/DIP)
INSERT INTO payment_methods (code, name, provider, config) VALUES
('orange_money', 'Orange Money', 'Orange Cameroun', '{"currency": "XAF", "country": "CM"}'),
('mtn_money', 'MTN Mobile Money', 'MTN Cameroun', '{"currency": "XAF", "country": "CM"}'),
('cash', 'Espèces', NULL, '{"requires_confirmation": true}');

-- ==============================================
-- VUES UTILES
-- ==============================================

-- ==============================================
-- VUES UTILES (SOLID)
-- ==============================================

-- Vue: Appointments avec détails complets
CREATE OR REPLACE VIEW v_appointments_details AS
SELECT 
  a.id, a.scheduled_at, a.status, a.price_fcfa,
  uc.phone AS client_phone, uc.email AS client_email,
  cp.first_name AS client_first_name, cp.last_name AS client_last_name,
  pp.business_name AS provider_name, pp.city AS provider_city,
  up.phone AS provider_phone,
  s.name AS service_name, sc.name AS service_category,
  s.duration_minutes,
  pay.status AS payment_status,
  pm.name AS payment_method,
  ac.confirmed_at, ac.confirmed_by_user_id,
  acan.cancelled_at, acan.cancellation_reason
FROM appointments a
JOIN users uc ON a.client_id = uc.id
LEFT JOIN client_profiles cp ON uc.id = cp.user_id
JOIN provider_profiles pp ON a.provider_id = pp.id
JOIN users up ON pp.user_id = up.id
JOIN services s ON a.service_id = s.id
JOIN service_categories sc ON s.category_id = sc.id
LEFT JOIN payments pay ON a.id = pay.appointment_id
LEFT JOIN payment_methods pm ON pay.payment_method_id = pm.id
LEFT JOIN appointment_confirmations ac ON a.id = ac.appointment_id
LEFT JOIN appointment_cancellations acan ON a.id = acan.appointment_id;

-- Vue: Providers avec statistiques (SOLID)
CREATE OR REPLACE VIEW v_providers_stats AS
SELECT 
  pp.id, pp.business_name, pp.city, pp.neighborhood,
  pv.status AS verification_status,
  ps.average_rating, ps.total_reviews, ps.total_bookings,
  ps.total_completed, ps.total_cancelled,
  u.phone, u.email,
  COUNT(DISTINCT s.id) AS total_services,
  pss.offers_home_service, pss.home_service_radius_km
FROM provider_profiles pp
JOIN users u ON pp.user_id = u.id
LEFT JOIN provider_verifications pv ON pp.id = pv.provider_id
LEFT JOIN provider_statistics ps ON pp.id = ps.provider_id
LEFT JOIN provider_service_settings pss ON pp.id = pss.provider_id
LEFT JOIN services s ON pp.id = s.provider_id AND s.deleted_at IS NULL
WHERE pp.deleted_at IS NULL
GROUP BY pp.id;

-- ==============================================
-- FIN DU SCHEMA MVP - SOLID COMPLIANT
-- ==============================================
-- Tables: 20 (vs 10 original)
-- Principes SOLID respectés:
-- - SRP: Séparation responsabilités (profiles, settings, verifications, statistics)
-- - OCP: Tables de référence extensibles (roles, categories, payment_methods)
-- - LSP: Profils spécialisés (client_profiles, provider_profiles)
-- - ISP: Interfaces ségréguées (confirmations, cancellations séparées)
-- - DIP: Abstraction paiements (payment_methods, gateway_transactions)
-- ==============================================
