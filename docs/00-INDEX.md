# 📚 Documentation Schéma Base de Données - Index

## Vue d'Ensemble

**Architecture:** SOLID-compliant  
**Tables:** 20 tables  
**Moteur:** MySQL 8.0+ / InnoDB  
**Charset:** utf8mb4_unicode_ci

---

## 📑 Structure Documentation

### [01 - Module Authentification](./01-TABLES-AUTH.md)
- **users** - Table centrale authentification
- **roles** - Rôles système (OCP)
- **user_roles** - Attribution multi-rôles

### [02 - Module Profils](./02-TABLES-PROFILES.md)
- **client_profiles** - Profils clients (LSP)
- **provider_profiles** - Profils prestataires (SRP)
- **provider_service_settings** - Configuration services (SRP)
- **provider_verifications** - Workflow validation (SRP)
- **provider_statistics** - Métriques prestataires (SRP)

### [03 - Module Horaires & Services](./03-TABLES-SCHEDULES-SERVICES.md)
- **provider_schedules** - Horaires hebdomadaires
- **provider_schedule_exceptions** - Exceptions horaires
- **service_categories** - Catégories services (OCP)
- **services** - Catalogue services

### [04 - Module Réservations](./04-TABLES-APPOINTMENTS.md)
- **appointments** - Réservations core (ISP)
- **appointment_confirmations** - Confirmations (ISP)
- **appointment_cancellations** - Annulations (ISP)

### [05 - Module Paiements](./05-TABLES-PAYMENTS.md)
- **payment_methods** - Méthodes paiement (OCP/DIP)
- **payments** - Transactions (DIP)
- **payment_gateway_transactions** - Détails gateway (DIP)
- **payment_attempts** - Tentatives paiement

### [06 - Module Avis](./06-TABLES-REVIEWS.md)
- **reviews** - Avis clients

---

## 🎯 Principes SOLID Appliqués

### SRP (Single Responsibility Principle)
**Tables concernées:** provider_profiles, provider_service_settings, provider_verifications, provider_statistics

**Avant:** 1 table `providers` avec toutes les responsabilités  
**Après:** 4 tables spécialisées, chacune avec 1 responsabilité

### OCP (Open/Closed Principle)
**Tables concernées:** roles, service_categories, payment_methods

**Avantage:** Ajout nouveau rôle/catégorie/méthode = simple INSERT, pas d'ALTER TABLE

### LSP (Liskov Substitution Principle)
**Tables concernées:** client_profiles, provider_profiles

**Principe:** Profils spécialisés substituables à `users` dans leurs contextes

### ISP (Interface Segregation Principle)
**Tables concernées:** appointments, appointment_confirmations, appointment_cancellations

**Principe:** Interfaces ségrégées, pas de colonnes NULL inutiles

### DIP (Dependency Inversion Principle)
**Tables concernées:** payment_methods, payments, payment_gateway_transactions

**Principe:** Dépendance sur abstraction, pas sur implémentation concrète

---

## 📊 Diagramme Relations Simplifié

```
users (1) ----< (N) user_roles ----< (N) roles
  |
  ├─ (1:1) client_profiles
  |
  └─ (1:1) provider_profiles
              |
              ├─ (1:1) provider_service_settings
              ├─ (1:1) provider_verifications
              ├─ (1:1) provider_statistics
              ├─ (1:N) provider_schedules
              ├─ (1:N) provider_schedule_exceptions
              ├─ (1:N) services ----< (N) service_categories
              └─ (1:N) appointments
                        |
                        ├─ (1:1) appointment_confirmations
                        ├─ (1:1) appointment_cancellations
                        ├─ (1:1) payments ----< (N) payment_methods
                        |         |
                        |         ├─ (1:N) payment_gateway_transactions
                        |         └─ (1:N) payment_attempts
                        |
                        └─ (1:1) reviews
```

---

## 🔑 Contraintes Critiques

### Double Booking Prevention
```sql
UNIQUE KEY unique_provider_slot (provider_id, scheduled_at)
```
**Rôle:** Empêche 2 clients de réserver même créneau

### Idempotence Paiements
```sql
external_transaction_id VARCHAR(255) UNIQUE
```
**Rôle:** Empêche traitement double d'un webhook

### 1 Avis par RDV
```sql
appointment_id INT UNIQUE
```
**Rôle:** Un client ne peut laisser qu'un seul avis par RDV

---

## 🔄 Triggers Automatiques

### after_review_insert / after_review_update
**Rôle:** Met à jour `provider_statistics.average_rating` et `total_reviews`

### after_appointment_confirmed
**Rôle:** Incrémente `provider_statistics.total_bookings` et `services.booking_count`

---

## 📈 Vues Utiles

### v_appointments_details
**Rôle:** Join complet appointments avec tous les détails (client, provider, service, payment)

### v_providers_stats
**Rôle:** Statistiques complètes par provider (services, bookings, ratings)

---

## 🚀 Avantages Architecture SOLID

1. **Extensibilité** - Nouveau rôle/catégorie = INSERT, pas ALTER
2. **Maintenabilité** - Responsabilités claires, facile debug
3. **Testabilité** - Chaque table testable indépendamment
4. **Scalabilité** - Ajout fonctionnalités sans casser existant
5. **Flexibilité** - Abstraction permet changement implémentation

---

## 📝 Données Seed Incluses

### Rôles
- client, provider, admin

### Catégories Services
- coiffure (+ sous-catégories: afro, lisse, enfant)
- esthetique (+ sous-catégories: soin_visage, epilation)
- manucure, massage, maquillage

### Méthodes Paiement
- Orange Money, MTN Money, Espèces

---

## 🔍 Recherche Rapide

**Par module:**
- Auth → [01-TABLES-AUTH.md](./01-TABLES-AUTH.md)
- Profils → [02-TABLES-PROFILES.md](./02-TABLES-PROFILES.md)
- Services → [03-TABLES-SCHEDULES-SERVICES.md](./03-TABLES-SCHEDULES-SERVICES.md)
- Réservations → [04-TABLES-APPOINTMENTS.md](./04-TABLES-APPOINTMENTS.md)
- Paiements → [05-TABLES-PAYMENTS.md](./05-TABLES-PAYMENTS.md)
- Avis → [06-TABLES-REVIEWS.md](./06-TABLES-REVIEWS.md)

**Par principe SOLID:**
- SRP → provider_*, appointment_*, payment_*
- OCP → roles, service_categories, payment_methods
- LSP → client_profiles, provider_profiles
- ISP → appointment_confirmations, appointment_cancellations
- DIP → payment_methods, payment_gateway_transactions
