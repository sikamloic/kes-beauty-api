-- Script SQL pour vérifier les données utilisateur

-- Voir tous les users
SELECT 
  u.id,
  u.phone,
  u.email,
  u.is_active,
  u.password_hash,
  pp.id as provider_id,
  pp.full_name
FROM users u
LEFT JOIN provider_profiles pp ON u.id = pp.user_id;

-- Chercher par téléphone normalisé
SELECT * FROM users WHERE phone = '237683264591';

-- Chercher par téléphone court
SELECT * FROM users WHERE phone = '683264591';

-- Compter les users
SELECT COUNT(*) as total_users FROM users;
