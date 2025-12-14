# ⭐ Module Avis & Évaluations

## 20. reviews - Avis Clients

**Rôle:** Avis et évaluations des services.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| appointment_id | INT | Référence RDV | UNIQUE, FK appointments.id |
| client_id | INT | Référence client | FK users.id |
| provider_id | INT | Référence provider | FK provider_profiles.id |
| rating | TINYINT | Note globale | NOT NULL, CHECK (1-5) |
| comment | TEXT | Commentaire | NULL |
| quality_rating | TINYINT | Note qualité | NULL, CHECK (1-5) |
| punctuality_rating | TINYINT | Note ponctualité | NULL, CHECK (1-5) |
| hospitality_rating | TINYINT | Note accueil | NULL, CHECK (1-5) |
| value_rating | TINYINT | Note rapport qualité/prix | NULL, CHECK (1-5) |
| is_verified | BOOLEAN | Avis vérifié | DEFAULT TRUE |
| is_visible | BOOLEAN | Visible publiquement | DEFAULT TRUE |
| moderation_status | VARCHAR(50) | Statut modération | DEFAULT 'approved' |
| moderation_reason | TEXT | Raison modération | NULL |
| moderated_by_user_id | INT | Modérateur | FK users.id, NULL |
| moderated_at | TIMESTAMP | Date modération | NULL |
| provider_response | TEXT | Réponse prestataire | NULL |
| provider_responded_at | TIMESTAMP | Date réponse | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |
| deleted_at | TIMESTAMP | Soft delete | NULL |

### Relations
- `1:1` → appointments (CASCADE)
- `N:1` → users (client, CASCADE)
- `N:1` → provider_profiles (CASCADE)
- `N:1` → users (modérateur, SET NULL)

### Index
- idx_appointment (appointment_id)
- idx_client (client_id)
- idx_provider (provider_id, is_visible)
- idx_rating (rating)
- idx_created (created_at)

### Contraintes
- UNIQUE(appointment_id) - 1 avis par RDV
- CHECK(rating BETWEEN 1 AND 5)

### Statuts modération
- pending - En attente modération
- approved - Approuvé
- rejected - Rejeté

### Mise à jour automatique
Triggers mettent à jour `provider_statistics`:
- average_rating
- total_reviews

### Cas d'usage
```sql
-- Avis simple
rating=5, comment="Excellent service!"

-- Avis détaillé
rating=4, quality_rating=5, punctuality_rating=3, 
hospitality_rating=5, value_rating=4

-- Réponse prestataire
provider_response="Merci pour votre retour!"
```

### Modération
- Automatique: mots interdits
- Manuelle: admin peut rejeter/approuver
- is_visible=FALSE cache l'avis
