# 👤 Module Profils Utilisateurs

## 4. client_profiles - Profils Clients (LSP)

**Rôle:** Données spécifiques clients.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| user_id | INT | Référence user | FK users.id, UNIQUE |
| first_name | VARCHAR(100) | Prénom | NULL |
| last_name | VARCHAR(100) | Nom | NULL |
| date_of_birth | DATE | Date naissance | NULL |
| preferences | JSON | Préférences | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |

### Relations
- `1:1` → users (CASCADE)

### Principe SOLID
**LSP** - Profil spécialisé substituable

### Exemple JSON preferences
```json
{
  "hair_type": "afro",
  "budget_range": "10000-30000",
  "preferred_days": ["saturday", "sunday"],
  "allergies": ["ammonia"]
}
```

---

## 5. provider_profiles - Profils Prestataires (SRP)

**Rôle:** Informations business et localisation.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| user_id | INT | Référence user | FK users.id, UNIQUE |
| business_name | VARCHAR(255) | Nom salon | NULL |
| bio | TEXT | Présentation | NULL |
| years_experience | INT | Années expérience | DEFAULT 0 |
| address | TEXT | Adresse complète | NOT NULL |
| city | VARCHAR(100) | Ville | NOT NULL |
| neighborhood | VARCHAR(100) | Quartier | NULL |
| latitude | DECIMAL(10,8) | GPS latitude | NULL |
| longitude | DECIMAL(11,8) | GPS longitude | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |
| deleted_at | TIMESTAMP | Soft delete | NULL |

### Relations
- `1:1` → users (CASCADE)
- `1:1` → provider_service_settings
- `1:1` → provider_verifications
- `1:1` → provider_statistics
- `1:N` → provider_schedules
- `1:N` → services
- `1:N` → appointments

### Index
- idx_user (user_id)
- idx_location (city, neighborhood)
- idx_coordinates (latitude, longitude)

### Principe SOLID
**SRP** - Responsabilité unique: profil business

---

## 6. provider_service_settings - Config Services (SRP)

**Rôle:** Paramètres services proposés.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| provider_id | INT | Référence provider | FK provider_profiles.id, UNIQUE |
| offers_home_service | BOOLEAN | Services à domicile | DEFAULT FALSE |
| home_service_radius_km | INT | Rayon intervention | DEFAULT 0 |
| auto_accept_bookings | BOOLEAN | Auto-acceptation | DEFAULT FALSE |
| booking_advance_days | INT | Jours avance max | DEFAULT 30 |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |

### Relations
- `1:1` → provider_profiles (CASCADE)

### Principe SOLID
**SRP** - Responsabilité unique: configuration

### Cas d'usage
- offers_home_service=TRUE + radius=10 → Déplacement 10km
- auto_accept_bookings=TRUE → Confirmation auto

---

## 7. provider_verifications - Validation (SRP)

**Rôle:** Workflow validation prestataires.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| provider_id | INT | Référence provider | FK provider_profiles.id, UNIQUE |
| status | VARCHAR(50) | Statut | NOT NULL, DEFAULT 'pending' |
| verified_by_user_id | INT | Admin validateur | FK users.id, NULL |
| verified_at | TIMESTAMP | Date validation | NULL |
| rejection_reason | TEXT | Raison rejet | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |

### Relations
- `1:1` → provider_profiles (CASCADE)
- `N:1` → users (SET NULL)

### Principe SOLID
**SRP** - Responsabilité unique: workflow

### Statuts
- pending - En attente
- approved - Approuvé
- rejected - Rejeté
- suspended - Suspendu

---

## 8. provider_statistics - Métriques (SRP)

**Rôle:** Métriques calculées (performance).

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| provider_id | INT | Référence provider | PK, FK provider_profiles.id |
| average_rating | DECIMAL(3,2) | Note moyenne | DEFAULT 0.00 |
| total_reviews | INT | Nombre avis | DEFAULT 0 |
| total_bookings | INT | Nombre RDV | DEFAULT 0 |
| total_completed | INT | RDV complétés | DEFAULT 0 |
| total_cancelled | INT | RDV annulés | DEFAULT 0 |
| last_calculated_at | TIMESTAMP | Dernière MAJ | AUTO UPDATE |

### Relations
- `1:1` → provider_profiles (CASCADE)

### Principe SOLID
**SRP** - Responsabilité unique: statistiques

### Mise à jour
Automatique via triggers (after_review_insert, after_appointment_confirmed)

### Avantage
Évite calculs coûteux à chaque requête
