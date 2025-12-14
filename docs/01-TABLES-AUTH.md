# 🔐 Module Authentification & Utilisateurs

## 1. users - Table Centrale

**Rôle:** Authentification commune à tous les utilisateurs.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant unique | PK, AUTO_INCREMENT |
| phone | VARCHAR(20) | Téléphone (+237XXX) | UNIQUE, NOT NULL |
| email | VARCHAR(255) | Email optionnel | UNIQUE |
| password_hash | VARCHAR(255) | Hash bcrypt | NOT NULL |
| phone_verified_at | TIMESTAMP | Date vérification tél | NULL |
| email_verified_at | TIMESTAMP | Date vérification email | NULL |
| is_active | BOOLEAN | Compte actif | DEFAULT TRUE |
| last_login_at | TIMESTAMP | Dernière connexion | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |
| deleted_at | TIMESTAMP | Soft delete (RGPD) | NULL |

### Relations
- `1:N` → user_roles
- `1:1` → client_profiles
- `1:1` → provider_profiles

### Index
- idx_phone (phone)
- idx_email (email)
- idx_active (is_active, deleted_at)

### Principe SOLID
**LSP** - Base minimale, pas de colonnes spécifiques rôle

---

## 2. roles - Rôles Système (OCP)

**Rôle:** Table référence extensible pour rôles.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| code | VARCHAR(50) | Code technique | UNIQUE, NOT NULL |
| name | VARCHAR(100) | Nom affichable | NOT NULL |
| description | TEXT | Description | NULL |
| is_active | BOOLEAN | Actif | DEFAULT TRUE |
| created_at | TIMESTAMP | Date création | AUTO |

### Relations
- `1:N` → user_roles

### Principe SOLID
**OCP** - Nouveau rôle = INSERT, pas ALTER TABLE

### Seed Data
```sql
('client', 'Client', 'Utilisateur final')
('provider', 'Prestataire', 'Fournisseur services')
('admin', 'Administrateur', 'Admin plateforme')
```

---

## 3. user_roles - Multi-Rôles

**Rôle:** Jonction permettant plusieurs rôles par user.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| user_id | INT | Référence user | FK users.id |
| role_id | INT | Référence rôle | FK roles.id |
| created_at | TIMESTAMP | Date attribution | AUTO |

### Relations
- `N:1` → users (CASCADE)
- `N:1` → roles (RESTRICT)

### Contraintes
- UNIQUE(user_id, role_id)

### Cas d'usage
Prestataire peut aussi être client.
