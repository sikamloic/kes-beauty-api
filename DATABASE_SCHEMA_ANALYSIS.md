# 📊 Analyse du Schéma de Base de Données MVP

## ✅ Fichier Généré

**Fichier:** `database-schema-mvp.sql`  
**Tables:** 10 tables principales  
**Triggers:** 3 triggers automatiques  
**Vues:** 2 vues pour requêtes fréquentes

---

## 🗂️ Structure des Tables

### 1. **users** - Authentification centrale
- ✅ Multi-rôles supporté (via `user_roles`)
- ✅ Soft delete (`deleted_at`)
- ✅ Vérification phone/email séparée
- ✅ Index sur phone, email, is_active

**Décisions:**
- Phone format: `+237XXXXXXXXX` (international)
- Email optionnel
- Password hash avec bcrypt

### 2. **user_roles** - Rôles multiples
- ✅ Un user peut être client ET provider
- ✅ Contrainte UNIQUE(user_id, role)
- ✅ Cascade delete si user supprimé

**Rôles disponibles:**
- `client` - Utilisateur final
- `provider` - Prestataire de services
- `admin` - Administrateur plateforme

### 3. **providers** - Profils prestataires
- ✅ Géolocalisation complète (city, neighborhood, lat/lng)
- ✅ Status workflow (pending → approved/rejected/suspended)
- ✅ Métriques dénormalisées (average_rating, total_reviews, total_bookings)
- ✅ Services à domicile avec rayon

**Métriques auto-calculées:**
- `average_rating` - Mis à jour par trigger
- `total_reviews` - Mis à jour par trigger
- `total_bookings` - Mis à jour par trigger

### 4. **provider_schedules** - Horaires hebdomadaires
- ✅ Un horaire par jour de semaine
- ✅ Support pause déjeuner
- ✅ Contrainte UNIQUE(provider_id, day_of_week)

**Exemple:**
```sql
-- Lundi: 8h-18h avec pause 12h-14h
INSERT INTO provider_schedules VALUES
(provider_id, 'monday', TRUE, '08:00', '18:00', '12:00', '14:00');
```

### 5. **provider_schedule_exceptions** - Congés/Exceptions
- ✅ Gestion jours fériés, congés, formations
- ✅ Horaires personnalisés pour un jour spécifique

**Cas d'usage:**
- Congés: `is_available = FALSE`
- Horaires exceptionnels: `custom_start_time`, `custom_end_time`

### 6. **services** - Catalogue
- ✅ Catégorisation (coiffure, esthétique, manucure, massage)
- ✅ Prix flexible (fixed, from, negotiable)
- ✅ Acompte configurable
- ✅ Buffer time entre rendez-vous

**Prix types:**
- `fixed` - Prix fixe (ex: 10,000 FCFA)
- `from` - À partir de (ex: À partir de 15,000 FCFA)
- `negotiable` - Prix négociable

### 7. **appointments** - CŒUR DU SYSTÈME ⚠️

**Contraintes critiques:**
```sql
-- Évite double booking
UNIQUE KEY unique_provider_slot (provider_id, scheduled_at)
```

**Workflow status:**
1. `pending` - Demande client
2. `confirmed` - Provider accepte
3. `in_progress` - Service en cours
4. `completed` - Service terminé
5. `cancelled` - Annulé
6. `no_show` - Client absent

**Tracking complet:**
- ✅ Qui a confirmé + quand
- ✅ Qui a annulé + raison + type
- ✅ No-show reporté par qui + quand
- ✅ Rappels SMS envoyés (24h, 2h)
- ✅ Prix snapshot (au moment réservation)

**Colonne calculée:**
```sql
end_at GENERATED ALWAYS AS (scheduled_at + INTERVAL duration_minutes MINUTE)
```

### 8. **payments** - Transactions

**Idempotence garantie:**
```sql
external_transaction_id VARCHAR(255) UNIQUE  -- ID Orange/MTN
internal_reference VARCHAR(100) UNIQUE       -- Notre référence
```

**Répartition:**
- `amount_fcfa` - Montant total
- `provider_amount_fcfa` - Part prestataire
- `platform_commission_fcfa` - Commission plateforme

**Webhook tracking:**
- `webhook_received_at` - Quand reçu
- `webhook_verified` - Signature vérifiée
- `gateway_response` - JSON complet

**Remboursement:**
- Support partiel et total
- Raison obligatoire
- Timestamp refund

### 9. **payment_attempts** - Historique tentatives
- ✅ Retry logic trackée
- ✅ Erreurs stockées (code + message)
- ✅ Réponse gateway complète en JSON

### 10. **reviews** - Avis clients

**Contraintes:**
```sql
rating TINYINT CHECK (rating BETWEEN 1 AND 5)
appointment_id INT UNIQUE  -- 1 avis par rendez-vous
```

**Modération:**
- Status: pending, approved, rejected
- Raison modération
- Qui a modéré + quand

**Réponse provider:**
- `provider_response` - Texte réponse
- `provider_responded_at` - Timestamp

**Notes détaillées (P1):**
- `quality_rating` - Qualité service
- `punctuality_rating` - Ponctualité
- `hospitality_rating` - Accueil
- `value_rating` - Rapport qualité/prix

---

## 🔄 Triggers Automatiques

### 1. **after_review_insert**
Met à jour `providers.average_rating` et `providers.total_reviews` après insertion avis.

### 2. **after_review_update**
Met à jour métriques provider après modification avis (ex: modération).

### 3. **after_appointment_confirmed**
Incrémente `services.booking_count` et `providers.total_bookings` quand status passe à `confirmed`.

**Avantage:** Métriques toujours à jour sans queries complexes.

---

## 📈 Vues Utiles

### 1. **v_appointments_details**
Join complet appointments avec client, provider, service, payment.

**Usage:**
```sql
SELECT * FROM v_appointments_details 
WHERE provider_id = 123 
  AND scheduled_at >= CURDATE()
ORDER BY scheduled_at;
```

### 2. **v_providers_stats**
Statistiques complètes par provider (services, bookings, ratings).

**Usage:**
```sql
SELECT * FROM v_providers_stats 
WHERE city = 'Douala' 
  AND average_rating >= 4.0
ORDER BY total_bookings DESC;
```

---

## ⚠️ Points Critiques

### 1. **Double Booking Prevention**
```sql
UNIQUE KEY unique_provider_slot (provider_id, scheduled_at)
```
**Limitation:** Provider ne peut avoir qu'1 client par créneau.  
**Solution P1:** Ajouter `capacity` dans schedules si besoin.

### 2. **Race Condition Paiements**
```sql
external_transaction_id VARCHAR(255) UNIQUE
```
**Protection:** Webhook reçu 2 fois = erreur UNIQUE constraint.  
**Gestion:** Catch erreur + vérifier si paiement existe déjà.

### 3. **Soft Delete Cascade**
```sql
deleted_at TIMESTAMP NULL
```
**Attention:** Queries doivent toujours filtrer `WHERE deleted_at IS NULL`.  
**Solution:** Utiliser scopes Prisma automatiques.

### 4. **Performance Géolocalisation**
```sql
INDEX idx_coordinates (latitude, longitude)
```
**Limitation:** Index B-tree, pas spatial.  
**Solution P1:** Migrer vers PostgreSQL + PostGIS si queries géo intensives.

### 5. **JSON Gateway Response**
```sql
gateway_response JSON NULL
```
**Attention:** MySQL 5.7+ requis pour type JSON.  
**Avantage:** Stockage flexible réponses API variables.

---

## 🔒 Sécurité

### Contraintes d'Intégrité
- ✅ Foreign Keys avec `ON DELETE RESTRICT` sur données critiques
- ✅ Foreign Keys avec `ON DELETE CASCADE` sur données dépendantes
- ✅ CHECK constraints sur ratings (1-5)
- ✅ UNIQUE constraints sur identifiants externes

### Prévention Injection SQL
- ✅ Utilisation Prisma/TypeORM (parameterized queries)
- ✅ Pas de queries dynamiques non sécurisées

### RGPD
- ✅ Soft delete sur users, providers, services, reviews
- ✅ Possibilité anonymisation données
- ✅ Audit trail complet (created_at, updated_at)

---

## 📊 Métriques Estimées

### Volumétrie Estimée (1 an)
- **Users:** ~10,000
- **Providers:** ~500
- **Services:** ~2,000
- **Appointments:** ~50,000
- **Payments:** ~50,000
- **Reviews:** ~30,000

### Taille Base de Données
- **Données:** ~500 MB
- **Index:** ~200 MB
- **Total:** ~700 MB

### Performance Queries Critiques
- Recherche providers par ville: `<50ms` (index city)
- Disponibilités provider: `<100ms` (index provider_id, scheduled_at)
- Historique client: `<50ms` (index client_id, status)
- Calcul rating provider: `<10ms` (dénormalisé)

---

## 🚀 Prochaines Étapes

### 1. Création Base de Données
```bash
# Créer la base
mysql -u root -p
CREATE DATABASE beauty_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Importer le schéma
mysql -u root -p beauty_platform < database-schema-mvp.sql
```

### 2. Configuration Prisma
```bash
# Initialiser Prisma
npx prisma init

# Introspect la base existante
npx prisma db pull

# Générer le client
npx prisma generate
```

### 3. Seed Données Test
```bash
# Créer seed script
npx prisma db seed
```

### 4. Validation
```bash
# Vérifier tables
npx prisma studio

# Tester triggers
# Insérer test data et vérifier métriques
```

---

## 📝 Notes Importantes

### Choix Techniques Faits

1. **Multi-rôles:** ✅ OUI (table user_roles)
2. **Soft Delete:** ✅ OUI (colonne deleted_at)
3. **Double Booking:** ❌ NON (UNIQUE constraint)
4. **Acompte:** ✅ OUI (configurable par service)
5. **Commission:** ⚠️ À définir (actuellement calculée dans code)

### Optimisations Futures (P1/P2)

- [ ] Index spatial pour géolocalisation (PostGIS)
- [ ] Partitioning table appointments par date
- [ ] Cache Redis pour providers populaires
- [ ] Full-text search sur services
- [ ] Réplication read-only pour analytics

### Migrations Prévues

- [ ] Table `referrals` (parrainage) - P1
- [ ] Table `media` (photos/documents) - P1
- [ ] Table `notifications` (historique) - P1
- [ ] Table `provider_certifications` - P1
- [ ] Table `favorites` (favoris clients) - P1

---

**Schéma validé et prêt pour implémentation Prisma** ✅
