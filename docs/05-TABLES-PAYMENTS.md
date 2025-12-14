# 💳 Module Paiements

## 16. payment_methods - Méthodes Paiement (OCP/DIP)

**Rôle:** Table référence extensible méthodes paiement.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| code | VARCHAR(50) | Code technique | UNIQUE, NOT NULL |
| name | VARCHAR(100) | Nom affichable | NOT NULL |
| provider | VARCHAR(100) | Fournisseur | NULL (Orange, MTN) |
| is_active | BOOLEAN | Active | DEFAULT TRUE |
| config | JSON | Config gateway | NULL |
| created_at | TIMESTAMP | Date création | AUTO |

### Relations
- `1:N` → payments

### Principe SOLID
**OCP + DIP** - Extensible, abstraction gateway

### Seed Data
```sql
('orange_money', 'Orange Money', 'Orange Cameroun', '{"currency":"XAF"}')
('mtn_money', 'MTN Mobile Money', 'MTN Cameroun', '{"currency":"XAF"}')
('cash', 'Espèces', NULL, '{"requires_confirmation":true}')
```

---

## 17. payments - Transactions (DIP)

**Rôle:** Transactions avec répartition commission.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| appointment_id | INT | Référence RDV | UNIQUE, FK appointments.id |
| user_id | INT | Qui a payé | FK users.id |
| payment_method_id | INT | Méthode | FK payment_methods.id |
| amount_fcfa | INT | Montant total | NOT NULL |
| provider_amount_fcfa | INT | Part prestataire | NOT NULL |
| platform_commission_fcfa | INT | Commission plateforme | NOT NULL |
| status | VARCHAR(50) | Statut | DEFAULT 'pending' |
| internal_reference | VARCHAR(100) | Référence interne | UNIQUE |
| payer_phone | VARCHAR(20) | Tél payeur | NULL |
| refunded_amount_fcfa | INT | Montant remboursé | DEFAULT 0 |
| refund_reason | TEXT | Raison remboursement | NULL |
| refunded_at | TIMESTAMP | Date remboursement | NULL |
| created_at | TIMESTAMP | Date création | AUTO |
| updated_at | TIMESTAMP | Date modification | AUTO |

### Relations
- `1:1` → appointments (RESTRICT)
- `N:1` → users (RESTRICT)
- `N:1` → payment_methods (RESTRICT)
- `1:N` → payment_gateway_transactions
- `1:N` → payment_attempts

### Index
- idx_appointment (appointment_id)
- idx_user (user_id)
- idx_status (status)
- idx_created (created_at)

### Principe SOLID
**DIP** - Dépend abstraction, pas implémentation

### Statuts
- pending - En attente
- processing - En cours
- completed - Complété
- failed - Échoué
- refunded - Remboursé

### Calcul commission
```
amount_fcfa = 20,000
platform_commission_fcfa = 2,000 (10%)
provider_amount_fcfa = 18,000 (90%)
```

---

## 18. payment_gateway_transactions - Détails Gateway (DIP)

**Rôle:** Détails spécifiques gateway (Orange, MTN).

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| payment_id | INT | Référence paiement | FK payments.id |
| external_transaction_id | VARCHAR(255) | ID transaction gateway | UNIQUE (IDEMPOTENCE) |
| gateway_response | JSON | Réponse complète API | NULL |
| webhook_received_at | TIMESTAMP | Date webhook | NULL |
| webhook_verified | BOOLEAN | Signature vérifiée | DEFAULT FALSE |
| created_at | TIMESTAMP | Date création | AUTO |

### Relations
- `N:1` → payments (CASCADE)

### Index
- idx_payment (payment_id)
- idx_external_id (external_transaction_id)

### Principe SOLID
**DIP** - Détails implémentation isolés

### Idempotence
`external_transaction_id UNIQUE` empêche traitement double webhook

---

## 19. payment_attempts - Tentatives

**Rôle:** Historique tentatives pour retry logic.

### Champs

| Champ | Type | Rôle | Contraintes |
|-------|------|------|-------------|
| id | INT | Identifiant | PK |
| payment_id | INT | Référence paiement | FK payments.id |
| attempt_number | INT | Numéro tentative | NOT NULL |
| status | VARCHAR(50) | Résultat | NOT NULL |
| error_code | VARCHAR(50) | Code erreur | NULL |
| error_message | TEXT | Message erreur | NULL |
| gateway_response | JSON | Réponse gateway | NULL |
| attempted_at | TIMESTAMP | Date tentative | AUTO |

### Relations
- `N:1` → payments (CASCADE)

### Statuts
- initiated - Initiée
- success - Succès
- failed - Échec

### Cas d'usage
Retry automatique après échec temporaire
