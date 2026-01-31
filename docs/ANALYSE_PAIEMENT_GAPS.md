# 📊 Analyse Critique : Système de Paiement & Fonctionnalités

**Date d'analyse :** 31 janvier 2026  
**Version :** 1.1  
**Statut :** En cours d'implémentation  
**Mise à jour :** Alignement délais annulation/report sur standard industrie (24h)

---

## 📋 Synthèse des Besoins Métier

### Paiement & Réservation

| Fonctionnalité | Spécification |
|----------------|---------------|
| **Paiement réservation** | 100% à la réservation |
| **Preuve de dépôt** | Demandée par l'application après validation |
| **Facture** | Numéro de réservation/achat généré après validation paiement |
| **Workflow prestation** | Client donne code 4 chiffres → Provider démarre → termine → reçoit paiement |

### Annulation

| Règle | Détail |
|-------|--------|
| **Délai gratuit** | > 24h avant le début de la prestation (standard industrie) |
| **Frais si < 24h** | Jusqu'à 50% du montant initial |
| **No-show** | 100% facturé (prestataire reçoit sa part) |

### Report de Prestation

| Règle | Détail |
|-------|--------|
| **Délai gratuit** | > 24h avant le début de la prestation (standard industrie) |
| **Frais si < 24h** | Frais appliqués + réajustement du montant nouvelle réservation |

### Vente de Produits

| Fonctionnalité | Spécification |
|----------------|---------------|
| **Livraison** | Pas de livraison par l'app, client se déplace |
| **Livraison provider** | Optionnelle, frais fixés par le prestataire |
| **Validation achat** | Double validation : client (récupération) + provider (vente) |
| **Litige produit** | Signalement défaut → annulation → remboursement (hors frais app) |

### Service Après-Vente

| Fonctionnalité | Spécification |
|----------------|---------------|
| **Notation** | Après chaque prestation/achat |
| **Évaluation** | Client note le prestataire et la prestation/produit |

---

## 🔍 Analyse des Gaps : Existant vs Besoins

### ✅ Ce qui EXISTE et est ALIGNÉ

| Composant | État | Localisation |
|-----------|------|--------------|
| Modèle `Appointment` | ✅ OK | `prisma/schema.prisma` |
| Statuts RDV | ✅ OK | pending, confirmed, in_progress, completed, cancelled, no_show |
| Transitions de statut | ✅ OK | `src/providers/services/appointments.service.ts` |
| `AppointmentConfirmation` | ✅ OK | `prisma/schema.prisma` |
| `AppointmentCancellation` | ✅ OK | `prisma/schema.prisma` |
| `Reviews` | ✅ Documenté | `database-schema-mvp.sql` |
| Tables paiement SQL | ✅ Documentées | `database-schema-mvp.sql` |

### ⚠️ Ce qui EXISTE mais est DÉSALIGNÉ

| Composant | Problème | Fichier | Ligne |
|-----------|----------|---------|-------|
| **Délai annulation** | ✅ Correctement à 24h (standard industrie) | `appointments.service.ts` | 476 |
| **Frais annulation** | Aucun calcul, juste refus (à implémenter) | `appointments.service.ts` | 477-479 |
| **depositFcfa** | Champ existe mais = 0, non utilisé | `schema.prisma` | - |
| **Modèles Prisma paiement** | Absents du schema.prisma | `schema.prisma` | - |

### ❌ Ce qui MANQUE TOTALEMENT

| Fonctionnalité | Criticité | Complexité | Module Concerné |
|----------------|-----------|------------|-----------------|
| **Report de prestation** | 🔴 Haute | Moyenne | Appointments |
| **Gestion produits** | 🔴 Haute | Haute | Nouveau module Products |
| **Double validation achat** | 🔴 Haute | Moyenne | Products |
| **Litige/Signalement défaut** | 🟠 Moyenne | Moyenne | Disputes |
| **Génération facture/référence** | 🔴 Haute | Faible | Payments |
| **Preuve de dépôt** | 🟠 Moyenne | Moyenne | Payments |
| **Versement provider** | 🔴 Haute | Haute | Payouts |
| **Frais livraison provider** | 🟠 Moyenne | Faible | Products |
| **Modèles Prisma Payment** | 🔴 Critique | Moyenne | Prisma |

---

## 🏗️ Architecture Proposée

### Nouveaux Modèles de Données

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE ÉTENDUE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐           │
│  │   SERVICE   │     │   PRODUCT   │     │  ORDER (Commande)   │           │
│  │ (Prestation)│     │  (Produit)  │     │  type: service|     │           │
│  └──────┬──────┘     └──────┬──────┘     │       product       │           │
│         │                   │            └──────────┬──────────┘           │
│         └───────────────────┴───────────────────────┤                      │
│                                                     │                      │
│  ┌──────────────────────────────────────────────────┴─────────────────┐    │
│  │                         PAYMENT                                     │    │
│  │  - amount_fcfa (100% total)                                        │    │
│  │  - platform_commission_fcfa                                        │    │
│  │  - provider_amount_fcfa                                            │    │
│  │  - status: pending → completed → provider_paid                     │    │
│  │  - invoice_reference (KES-2026-XXXXX)                              │    │
│  │  - deposit_proof_url (preuve dépôt)                                │    │
│  └──────────────────────────────────────────────────┬─────────────────┘    │
│                                                     │                      │
│  ┌──────────────────────────────────────────────────┴─────────────────┐    │
│  │                    APPOINTMENT_RESCHEDULE (Report)                  │    │
│  │  - original_scheduled_at                                           │    │
│  │  - new_scheduled_at                                                │    │
│  │  - penalty_applied (bool)                                          │    │
│  │  - penalty_amount_fcfa                                             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    PRODUCT_ORDER (Commande produit)                 │    │
│  │  - client_validated_at                                             │    │
│  │  - provider_validated_at                                           │    │
│  │  - delivery_type: pickup | provider_delivery                       │    │
│  │  - delivery_fee_fcfa                                               │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    DISPUTE (Litige)                                 │    │
│  │  - type: wrong_product | damaged | other                          │    │
│  │  - status: open | resolved | refunded                              │    │
│  │  - refund_amount_fcfa                                              │    │
│  │  - platform_fee_retained (bool)                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    PROVIDER_PAYOUT (Versement)                      │    │
│  │  - amount_fcfa                                                     │    │
│  │  - status: pending | processing | completed | failed               │    │
│  │  - payout_method_id                                                │    │
│  │  - processed_at                                                    │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Règles Métier Configurables

```typescript
// src/config/business-rules.ts (À créer)
export const BUSINESS_RULES = {
  // Paiement
  PAYMENT_PERCENTAGE_AT_BOOKING: 100,  // 100% à la réservation
  PLATFORM_COMMISSION_PERCENTAGE: 10,  // 10% commission plateforme
  
  // Annulation (standard industrie: 24h)
  CANCELLATION_FREE_HOURS: 24,         // Gratuit > 24h avant
  CANCELLATION_PENALTY_PERCENTAGE: 50, // 50% de pénalité si < 24h
  NO_SHOW_PENALTY_PERCENTAGE: 100,     // 100% si no-show
  
  // Report (aligné sur annulation)
  RESCHEDULE_FREE_HOURS: 24,           // Gratuit > 24h avant
  RESCHEDULE_PENALTY_PERCENTAGE: 50,   // 50% si < 24h
  
  // Produits
  PRODUCT_REQUIRES_DOUBLE_VALIDATION: true,
  PRODUCT_DISPUTE_REFUND_PLATFORM_FEE: false, // Frais app non remboursés en cas de litige
  
  // Facture
  INVOICE_PREFIX: 'KES',
  INVOICE_YEAR_FORMAT: 'YYYY',
};
```

---

## ⚠️ Critique de l'Approche Actuelle

### Faiblesses Identifiées

| Problème | Sévérité | Solution Proposée |
|----------|----------|-------------------|
| **Modèles Prisma incomplets** | 🔴 Critique | Ajouter PaymentMethod, Payment, PaymentGatewayTransaction, PaymentAttempt au schema.prisma |
| **Pas de gestion produits** | 🔴 Critique | Nouveau module Products avec modèles Product, ProductOrder |
| **Logique métier hardcodée** | 🟠 Moyenne | Externaliser dans `src/config/business-rules.ts` (délai 24h = standard industrie) |
| **Pas de génération facture** | 🔴 Critique | Créer InvoiceService avec séquence unique |
| **Pas de versement provider** | 🔴 Critique | Créer ProviderPayoutService + CRON job |

### Risques Techniques

| Risque | Impact | Mitigation |
|--------|--------|------------|
| **Sécurité paiement** | 🔴 Élevé | Implémenter vérification signature webhook (Orange/MTN) |
| **Idempotence** | 🔴 Élevé | Utiliser `external_transaction_id` UNIQUE pour éviter double traitement |
| **Concurrence** | 🟠 Moyen | Transaction Prisma pour réservation créneaux (partiellement géré) |
| **Scalabilité** | 🟠 Moyen | Ajouter queue (Bull/BullMQ) pour paiements asynchrones |

---

## 📅 Plan d'Implémentation

### Phase 1 : Modèles Prisma (Priorité Haute)
- [ ] Ajouter `PaymentMethod` au schema.prisma
- [ ] Ajouter `Payment` au schema.prisma
- [ ] Ajouter `PaymentGatewayTransaction` au schema.prisma
- [ ] Ajouter `PaymentAttempt` au schema.prisma
- [ ] Ajouter `AppointmentReschedule` au schema.prisma
- [ ] Exécuter migration Prisma

### Phase 2 : Module Products (Priorité Haute)
- [ ] Créer modèle `Product`
- [ ] Créer modèle `ProductOrder`
- [ ] Créer modèle `ProductOrderValidation`
- [ ] Créer `ProductsModule` NestJS
- [ ] Implémenter CRUD produits
- [ ] Implémenter double validation

### Phase 3 : Services Paiement (Priorité Haute)
- [ ] Créer `PaymentService`
- [ ] Créer `InvoiceService` (génération référence)
- [ ] Intégrer Orange Money API
- [ ] Intégrer MTN MoMo API
- [ ] Implémenter webhooks

### Phase 4 : Règles Métier (Priorité Moyenne)
- [ ] Créer `src/config/business-rules.ts`
- [ ] Refactorer `cancelByClient()` pour calculer frais (délai 24h déjà OK)
- [ ] Implémenter calcul frais annulation
- [ ] Créer `RescheduleService` pour reports
- [ ] Implémenter frais de report

### Phase 5 : Versement Provider (Priorité Moyenne)
- [ ] Créer modèle `ProviderPayout`
- [ ] Créer `PayoutService`
- [ ] Implémenter CRON job versements
- [ ] Dashboard provider : suivi paiements

### Phase 6 : Litiges (Priorité Basse)
- [ ] Créer modèle `Dispute`
- [ ] Créer `DisputeService`
- [ ] Workflow résolution litiges
- [ ] Remboursement automatisé

---

## 📝 Questions en Suspens

1. ~~**No-show** : Le prestataire reçoit-il les 50% comme mentionné initialement, ou autre règle ?~~ → **Résolu : 100% facturé (standard industrie)**
2. **Commission plateforme** : Confirmé à 10% ?
3. **Délai versement provider** : Immédiat après "terminé" ou différé (J+1, J+7) ?
4. **Credentials API** : Orange Money / MTN MoMo - compte marchand disponible ?
5. ~~**Frais annulation < 1h** : Exactement 50% ou variable selon délai restant ?~~ → **Résolu : 50% si < 24h (standard industrie)**

---

## 📚 Fichiers Concernés

### À Modifier
- `prisma/schema.prisma` - Ajouter modèles paiement
- `src/providers/services/appointments.service.ts` - Refactorer annulation
- `src/config/configuration.ts` - Ajouter règles métier

### À Créer
- `src/config/business-rules.ts`
- `src/payments/` - Nouveau module
- `src/products/` - Nouveau module
- `src/disputes/` - Nouveau module
- `src/payouts/` - Nouveau module

---

*Document généré automatiquement - Mise à jour requise après chaque phase d'implémentation*
