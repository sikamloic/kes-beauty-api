# 📆 Module Réservations

## 13. appointments - Réservations Core (ISP)

**Rôle:** Table principale RDV, données essentielles uniquement.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| client_id | INT | Référence client | FK users.id |
| provider_id | INT | Référence provider | FK provider_profiles.id |
| service_id | INT | Référence service | FK services.id |
| scheduled_at | TIMESTAMP | Date/heure RDV | NOT NULL |
| duration_minutes | INT | Durée (snapshot) | NOT NULL |
| end_at | TIMESTAMP | Heure fin | GENERATED COLUMN |
| status | VARCHAR(50) | Statut | NOT NULL, DEFAULT 'pending' |
| price_fcfa | INT | Prix (snapshot) | NOT NULL |
| deposit_fcfa | INT | Acompte versé | DEFAULT 0 |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |

### Relations
- `N:1` → users (RESTRICT)
- `N:1` → provider_profiles (RESTRICT)
- `N:1` → services (RESTRICT)
- `1:1` → appointment_confirmations
- `1:1` → appointment_cancellations
- `1:1` → payments
- `1:1` → reviews

### Contraintes
- **UNIQUE(provider_id, scheduled_at)** - Évite double booking

### Index
- idx_client (client_id, status)
- idx_provider (provider_id, status)
- idx_scheduled (scheduled_at)
- idx_status (status)

### Principe SOLID
**ISP** - Interface minimale, détails séparés

### Statuts
- pending - En attente confirmation
- confirmed - Confirmé
- in_progress - En cours
- completed - Terminé
- cancelled - Annulé
- no_show - Client absent

### Colonne calculée
```sql
end_at = scheduled_at + INTERVAL duration_minutes MINUTE
```

---

## 14. appointment_confirmations - Confirmations (ISP)

**Rôle:** Détails confirmation RDV.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| appointment_id | INT | Référence RDV | PK, FK appointments.id |
| confirmed_at | TIMESTAMP | Date confirmation | NOT NULL |
| confirmed_by_user_id | INT | Qui a confirmé | FK users.id |

### Relations
- `1:1` → appointments (CASCADE)
- `N:1` → users (RESTRICT)

### Principe SOLID
**ISP** - Interface ségrégée, seulement si confirmé

---

## 15. appointment_cancellations - Annulations (ISP)

**Rôle:** Détails annulation RDV.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| appointment_id | INT | Référence RDV | PK, FK appointments.id |
| cancelled_at | TIMESTAMP | Date annulation | NOT NULL |
| cancelled_by_user_id | INT | Qui a annulé | FK users.id |
| cancellation_reason | TEXT | Raison | NULL |
| cancellation_type | VARCHAR(50) | Type | NULL |

### Relations
- `1:1` → appointments (CASCADE)
- `N:1` → users (RESTRICT)

### Principe SOLID
**ISP** - Interface ségrégée, seulement si annulé

### Types annulation
- client - Annulé par client
- provider - Annulé par prestataire
- admin - Annulé par admin
- system - Annulé auto (non-paiement)
