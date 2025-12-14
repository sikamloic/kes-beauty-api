# 📅 Module Horaires & Services

## 9. provider_schedules - Horaires Hebdomadaires

**Rôle:** Horaires récurrents par jour semaine.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| provider_id | INT | Référence provider | FK provider_profiles.id |
| day_of_week | ENUM | Jour semaine | NOT NULL (monday-sunday) |
| is_working | BOOLEAN | Travaille ce jour | DEFAULT TRUE |
| start_time | TIME | Heure début | NULL |
| end_time | TIME | Heure fin | NULL |
| break_start | TIME | Début pause | NULL |
| break_end | TIME | Fin pause | NULL |

### Relations
- `N:1` → provider_profiles (CASCADE)

### Contraintes
- UNIQUE(provider_id, day_of_week)

### Exemple
```sql
-- Lundi 8h-18h pause 12h-14h
(1, 'monday', TRUE, '08:00', '18:00', '12:00', '14:00')

-- Dimanche fermé
(1, 'sunday', FALSE, NULL, NULL, NULL, NULL)
```

---

## 10. provider_schedule_exceptions - Exceptions

**Rôle:** Congés, jours fériés, horaires spéciaux.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| provider_id | INT | Référence provider | FK provider_profiles.id |
| date | DATE | Date exception | NOT NULL |
| is_available | BOOLEAN | Disponible | DEFAULT FALSE |
| reason | VARCHAR(255) | Raison | NULL |
| custom_start_time | TIME | Heure début custom | NULL |
| custom_end_time | TIME | Heure fin custom | NULL |

### Relations
- `N:1` → provider_profiles (CASCADE)

### Cas d'usage
```sql
-- Congés Noël
(1, '2025-12-24', FALSE, 'Congés Noël', NULL, NULL)

-- Horaires réduits 1er janvier
(1, '2025-01-01', TRUE, 'Horaires réduits', '10:00', '14:00')
```

---

## 11. service_categories - Catégories (OCP)

**Rôle:** Hiérarchie extensible catégories services.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| code | VARCHAR(50) | Code technique | UNIQUE, NOT NULL |
| name | VARCHAR(100) | Nom affichable | NOT NULL |
| parent_id | INT | Catégorie parente | FK service_categories.id, NULL |
| icon | VARCHAR(255) | Icône | NULL |
| is_active | BOOLEAN | Active | DEFAULT TRUE |
| display_order | INT | Ordre affichage | DEFAULT 0 |
| created_at | TIMESTAMP | Date création | AUTO |

### Relations
- `1:N` → service_categories (sous-catégories)
- `1:N` → services

### Principe SOLID
**OCP** - Extensible sans ALTER TABLE

### Hiérarchie
```
coiffure
  ├─ coiffure_afro
  ├─ coiffure_lisse
  └─ coiffure_enfant

esthetique
  ├─ soin_visage
  └─ epilation
```

---

## 12. services - Catalogue

**Rôle:** Services avec tarification et durée.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| provider_id | INT | Référence provider | FK provider_profiles.id |
| category_id | INT | Référence catégorie | FK service_categories.id |
| name | VARCHAR(255) | Nom service | NOT NULL |
| description | TEXT | Description | NULL |
| price_fcfa | INT | Prix FCFA | NOT NULL |
| price_type | VARCHAR(50) | Type prix | DEFAULT 'fixed' |
| duration_minutes | INT | Durée (min) | NOT NULL |
| buffer_time_minutes | INT | Temps entre RDV | DEFAULT 0 |
| is_active | BOOLEAN | Actif | DEFAULT TRUE |
| requires_deposit | BOOLEAN | Acompte requis | DEFAULT FALSE |
| deposit_percentage | INT | % acompte | DEFAULT 0 |
| booking_count | INT | Nombre réservations | DEFAULT 0 |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |
| deleted_at | TIMESTAMP | Soft delete | NULL |

### Relations
- `N:1` → provider_profiles (CASCADE)
- `N:1` → service_categories (RESTRICT)
- `1:N` → appointments

### Index
- idx_provider (provider_id, is_active)
- idx_category (category_id, is_active)
- idx_price (price_fcfa)

### Types prix
- fixed - Prix fixe (15,000 FCFA)
- from - À partir de (20,000 FCFA)
- negotiable - Prix négociable

### Buffer time
Temps nettoyage/préparation entre clients
