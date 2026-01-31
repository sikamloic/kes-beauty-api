# 🛡️ Spécifications : Système de Confiance & Protection

**Date de création :** 31 janvier 2026  
**Version :** 1.0  
**Statut :** En attente de validation

---

## 📋 Table des matières

1. [Contexte et objectifs](#contexte-et-objectifs)
2. [Scénarios identifiés](#scénarios-identifiés)
3. [Architecture de la solution](#architecture-de-la-solution)
4. [Phase 1 : Sans paiement](#phase-1--sans-paiement)
5. [Phase 2 : Avec paiement](#phase-2--avec-paiement)
6. [Modèles de données](#modèles-de-données)
7. [Endpoints API](#endpoints-api)
8. [Plan d'implémentation](#plan-dimplémentation)

---

## Contexte et objectifs

### Problématique

Le système de paiement ne sera pas disponible immédiatement. Sans levier financier (acompte, pénalités), il faut mettre en place des mécanismes alternatifs pour :

1. **Protéger les providers** contre les clients qui ne viennent pas
2. **Protéger les clients** contre les providers indisponibles
3. **Gérer les cas exceptionnels** (annulations tardives légitimes)
4. **Construire la confiance** entre les parties

### Objectifs

| Objectif | Métrique cible |
|----------|----------------|
| Réduire les no-shows | < 10% des RDV confirmés |
| Éliminer les récidivistes | 0 utilisateur avec > 3 incidents |
| Résoudre les litiges | < 48h en moyenne |
| Satisfaction utilisateurs | > 4.5/5 étoiles |

---

## Scénarios identifiés

### Scénarios principaux

| # | Scénario | Partie lésée | Fréquence estimée | Gravité |
|---|----------|--------------|-------------------|---------|
| 1 | Client ne vient pas (no-show) | Provider | Moyenne | 🔴 Haute |
| 2 | Provider indisponible (client sur place) | Client | Rare | 🔴 Haute |
| 3 | Annulation tardive légitime (< 24h) | Variable | Moyenne | 🟠 Moyenne |
| 4 | Client annule > 24h | Personne | Fréquente | 🟢 Faible |
| 5 | Provider annule > 24h | Client | Rare | 🟠 Moyenne |

### Scénarios secondaires

| # | Scénario | Partie lésée | Fréquence estimée | Gravité |
|---|----------|--------------|-------------------|---------|
| 6 | Client en retard (> 15 min) | Provider | Fréquente | 🟠 Moyenne |
| 7 | Provider en retard (> 15 min) | Client | Moyenne | 🟠 Moyenne |
| 8 | Litige qualité (prestation non conforme) | Client | Rare | 🔴 Haute |
| 9 | Prestation partielle | Client | Rare | 🟠 Moyenne |
| 10 | Client ne reconfirme pas | Provider | Moyenne | 🟠 Moyenne |

---

## Architecture de la solution

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SYSTÈME DE CONFIANCE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │    RÉPUTATION    │  │    ENGAGEMENT    │  │     RECOURS      │          │
│  │    (Scores)      │  │  (Confirmations) │  │    (Litiges)     │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           ▼                     ▼                     ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      COUCHE MÉTIER                                    │  │
│  │  ReputationService │ AppointmentLifecycleService │ DisputeService    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      COUCHE DONNÉES                                   │  │
│  │  ClientReputation │ ProviderReputation │ Dispute │ Review │ Favorite │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Composants principaux

| Composant | Responsabilité |
|-----------|----------------|
| **ReputationService** | Calcul et mise à jour des scores client/provider |
| **AppointmentLifecycleService** | Gestion du cycle de vie complet du RDV |
| **DisputeService** | Création, suivi et résolution des litiges |
| **ReviewService** | Notes, avis et réponses |
| **NotificationService** | Rappels, alertes, confirmations |

---

## Phase 1 : Sans paiement

### 1. Système de réputation

#### 1.1 Score Client

| Événement | Points | Condition |
|-----------|--------|-----------|
| RDV honoré (completed) | +10 | - |
| Annulation > 24h | -5 | - |
| Annulation < 24h (acceptée) | -10 | Motif validé |
| Annulation < 24h (refusée) | -15 | Litige perdu |
| No-show | -30 | - |
| Retard > 15 min | -5 | Signalé par provider |
| Retard > 30 min | -10 | Signalé par provider |
| Avis positif laissé | +2 | Note ≥ 4 étoiles |
| Litige gagné | +5 | - |
| Litige perdu | -20 | - |

**Score initial :** 50 points

#### 1.2 Score Provider

| Événement | Points | Condition |
|-----------|--------|-----------|
| RDV honoré (completed) | +10 | - |
| Annulation > 24h | -10 | - |
| Annulation < 24h (acceptée) | -15 | Motif validé |
| Annulation < 24h (refusée) | -25 | Litige perdu |
| Indisponible (client sur place) | -50 | Client signale |
| Retard > 15 min | -10 | Signalé par client |
| Retard > 30 min | -20 | Signalé par client |
| Avis positif reçu | +5 | Note ≥ 4 étoiles |
| Réponse à avis | +1 | - |
| Litige gagné | +5 | - |
| Litige perdu | -30 | - |

**Score initial :** 50 points

#### 1.3 Conséquences des scores

| Seuil | Client | Provider |
|-------|--------|----------|
| **> 70** | Badge "Client fiable ✓" | Badge "Pro fiable ✓" visible |
| **50-70** | Normal | Normal |
| **30-50** | Alerte discrète au provider | Alerte visible aux clients |
| **< 30** | Limite 1 RDV en attente | Baisse dans les résultats de recherche |
| **< 0** | Suspension 7 jours | Suspension + enquête admin |
| **3 incidents graves** | Blocage définitif | Désactivation compte |

> **Incident grave** = No-show, indisponibilité client sur place, litige perdu

---

### 2. Cycle de vie du rendez-vous

#### 2.1 Statuts

| Statut | Description | Transition depuis |
|--------|-------------|-------------------|
| `pending` | RDV créé, en attente confirmation provider | - |
| `confirmed` | Provider a confirmé, code généré | pending |
| `reconfirmed` | Client a confirmé sa venue (2h avant) | confirmed |
| `unconfirmed` | Client n'a pas reconfirmé | confirmed |
| `in_progress` | Prestation en cours (code validé) | confirmed, reconfirmed |
| `completed` | Prestation terminée | in_progress |
| `cancelled` | Annulé (> 24h ou accepté) | pending, confirmed, reconfirmed |
| `cancelled_late` | Annulation tardive avec pénalité | confirmed, reconfirmed |
| `no_show` | Client absent | confirmed, reconfirmed |
| `provider_absent` | Provider absent (client sur place) | confirmed, reconfirmed |
| `disputed` | Litige en cours | completed, no_show, provider_absent |

#### 2.2 Workflow complet

```
                                    ┌─────────────────────────────────────┐
                                    │           CRÉATION                   │
                                    │  Client réserve un créneau           │
                                    └─────────────────┬───────────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │   PENDING    │
                                              └──────┬───────┘
                                                     │
                          ┌──────────────────────────┼──────────────────────────┐
                          │                          │                          │
                          ▼                          ▼                          ▼
                   ┌─────────────┐           ┌──────────────┐           ┌─────────────┐
                   │  CANCELLED  │◄──────────│  CONFIRMED   │──────────►│  CANCELLED  │
                   │ (par client)│           │ + code généré│           │(par provider)│
                   └─────────────┘           └──────┬───────┘           └─────────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                    ▼               ▼               ▼
                            ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
                            │ RECONFIRMED │ │ UNCONFIRMED │ │ CANCELLED_LATE  │
                            │(client OK)  │ │(pas réponse)│ │(demande acceptée)│
                            └──────┬──────┘ └──────┬──────┘ └─────────────────┘
                                   │               │
                                   │    Provider peut libérer
                                   │               │
                                   ▼               ▼
                            ┌─────────────────────────────┐
                            │      HEURE DU RDV           │
                            │  Client arrive / n'arrive pas│
                            └─────────────┬───────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
            ┌─────────────┐       ┌─────────────┐       ┌───────────────┐
            │  NO_SHOW    │       │ IN_PROGRESS │       │PROVIDER_ABSENT│
            │(client absent)│     │(code validé)│       │(provider absent)│
            └─────────────┘       └──────┬──────┘       └───────────────┘
                    │                    │                      │
                    │                    ▼                      │
                    │             ┌─────────────┐               │
                    │             │  COMPLETED  │               │
                    │             └──────┬──────┘               │
                    │                    │                      │
                    ▼                    ▼                      ▼
            ┌─────────────────────────────────────────────────────────┐
            │                      DISPUTED                            │
            │              (si contestation)                           │
            └─────────────────────────────────────────────────────────┘
```

#### 2.3 Mécanismes automatiques

| Déclencheur | Action | Délai |
|-------------|--------|-------|
| RDV confirmé | Envoyer code au client | Immédiat |
| 2h avant RDV | Demander reconfirmation client | - |
| 1h avant RDV sans reconfirmation | Notifier provider "Client n'a pas confirmé" | - |
| 30 min après heure RDV sans code | Proposer au provider de marquer no-show | - |
| Client clique "Je suis arrivé" + 15 min sans code | Proposer au client de signaler provider absent | - |

---

### 3. Demande d'annulation exceptionnelle

#### 3.1 Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANNULATION TARDIVE (< 24h)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Partie A demande annulation                                             │
│     ├─ Sélectionne motif (medical, family, professional, other)             │
│     ├─ Ajoute description                                                   │
│     └─ Joint preuve (optionnel)                                             │
│                                                                              │
│  2. Statut RDV → "pending_cancellation"                                     │
│                                                                              │
│  3. Partie B notifiée                                                       │
│     "X souhaite annuler pour [motif]. Acceptez-vous ?"                      │
│                                                                              │
│  4a. Partie B accepte (dans les 2h ou avant heure RDV)                      │
│      └─ RDV annulé sans pénalité majeure                                    │
│      └─ Score demandeur : -10 (au lieu de -15/-25)                          │
│                                                                              │
│  4b. Partie B refuse                                                        │
│      └─ Litige ouvert automatiquement                                       │
│      └─ Admin tranche                                                       │
│                                                                              │
│  4c. Partie B ne répond pas avant heure RDV                                 │
│      └─ Annulation acceptée par défaut                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2 Motifs d'annulation

| Code | Libellé | Preuve suggérée |
|------|---------|-----------------|
| `medical` | Urgence médicale | Certificat médical |
| `family` | Urgence familiale | - |
| `professional` | Imprévu professionnel | - |
| `technical` | Problème technique (provider) | Photo |
| `other` | Autre | Description détaillée |

---

### 4. Système de litiges

#### 4.1 Types de litiges

| Code | Libellé | Ouvert par | Après statut |
|------|---------|------------|--------------|
| `no_show_contested` | Contestation no-show | Client | no_show |
| `provider_absent_contested` | Contestation absence provider | Provider | provider_absent |
| `quality_issue` | Problème qualité prestation | Client | completed |
| `partial_service` | Service incomplet | Client | completed |
| `late_cancellation_rejected` | Annulation tardive refusée | Demandeur | pending_cancellation |
| `payment_dispute` | Litige paiement (Phase 2) | Les deux | - |
| `other` | Autre | Les deux | - |

#### 4.2 Workflow litige

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CYCLE DE VIE LITIGE                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────┐    48h max    ┌───────────┐    Admin    ┌──────────────┐   │
│  │  OPEN   │──────────────►│ RESPONDED │────────────►│   RESOLVED   │   │
│  └─────────┘               └───────────┘             └──────────────┘   │
│       │                          │                          │            │
│       │ Pas de réponse           │                          │            │
│       ▼                          │                          ▼            │
│  ┌─────────────┐                 │                   ┌─────────────┐    │
│  │ ESCALATED   │◄────────────────┘                   │   CLOSED    │    │
│  │ (auto admin)│                                     └─────────────┘    │
│  └─────────────┘                                                         │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 4.3 Résolutions possibles

| Résolution | Impact demandeur | Impact défendeur |
|------------|------------------|------------------|
| `in_favor_of_opener` | +5 score, litige gagné | -20/-30 score, litige perdu |
| `in_favor_of_respondent` | -20/-30 score, litige perdu | +5 score, litige gagné |
| `mutual_fault` | -10 score | -10 score |
| `dismissed` | 0 | 0 |

---

### 5. Notes, Avis & Favoris

#### 5.1 Système de notation

| Critère | Qui note | Quand |
|---------|----------|-------|
| Note globale (1-5 étoiles) | Client → Provider | Après `completed` |
| Commentaire | Client | Optionnel |
| Réponse | Provider | Après publication avis |

#### 5.2 Règles

- Un seul avis par RDV
- Avis modifiable pendant 24h après publication
- Provider peut signaler avis abusif → Admin examine
- Avis visible après réponse provider OU après 7 jours

#### 5.3 Favoris

- Client peut ajouter/retirer un provider de ses favoris
- Liste accessible dans le profil client
- Favoris visibles dans les résultats de recherche (icône ❤️)

---

## Phase 2 : Avec paiement

> À implémenter quand le système de paiement sera disponible

### Mécanismes additionnels

| Mécanisme | Description |
|-----------|-------------|
| **Acompte obligatoire** | 20-50% à la réservation |
| **Pénalité no-show client** | Acompte conservé par provider |
| **Pénalité provider absent** | Remboursement 100% + compensation |
| **Annulation < 24h** | Frais 50% automatiques |
| **Remboursement litige** | Automatique si client gagne |

---

## Modèles de données

### Nouveaux modèles Prisma

```prisma
/// Score de réputation client
model ClientReputation {
  id                  Int       @id @default(autoincrement())
  clientId            Int       @unique @map("client_id")
  score               Int       @default(50)
  totalAppointments   Int       @default(0) @map("total_appointments")
  completedCount      Int       @default(0) @map("completed_count")
  noShowCount         Int       @default(0) @map("no_show_count")
  lateCount           Int       @default(0) @map("late_count")
  cancelledLateCount  Int       @default(0) @map("cancelled_late_count")
  disputesWonCount    Int       @default(0) @map("disputes_won_count")
  disputesLostCount   Int       @default(0) @map("disputes_lost_count")
  isSuspended         Boolean   @default(false) @map("is_suspended")
  suspendedUntil      DateTime? @map("suspended_until")
  suspensionReason    String?   @map("suspension_reason")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  client User @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@map("client_reputations")
}

/// Score de réputation provider
model ProviderReputation {
  id                  Int       @id @default(autoincrement())
  providerId          Int       @unique @map("provider_id")
  score               Int       @default(50)
  totalAppointments   Int       @default(0) @map("total_appointments")
  completedCount      Int       @default(0) @map("completed_count")
  noShowCount         Int       @default(0) @map("no_show_count")
  absentCount         Int       @default(0) @map("absent_count")
  lateCount           Int       @default(0) @map("late_count")
  cancelledLateCount  Int       @default(0) @map("cancelled_late_count")
  disputesWonCount    Int       @default(0) @map("disputes_won_count")
  disputesLostCount   Int       @default(0) @map("disputes_lost_count")
  isSuspended         Boolean   @default(false) @map("is_suspended")
  suspendedUntil      DateTime? @map("suspended_until")
  suspensionReason    String?   @map("suspension_reason")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  provider ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@map("provider_reputations")
}

/// Demande d'annulation exceptionnelle
model CancellationRequest {
  id                Int       @id @default(autoincrement())
  appointmentId     Int       @unique @map("appointment_id")
  requestedByUserId Int       @map("requested_by_user_id")
  requestedByRole   String    @map("requested_by_role") @db.VarChar(20) // client, provider
  reasonType        String    @map("reason_type") @db.VarChar(50) // medical, family, professional, technical, other
  reasonText        String?   @map("reason_text") @db.Text
  proofUrl          String?   @map("proof_url") @db.VarChar(500)
  status            String    @default("pending") @db.VarChar(20) // pending, accepted, rejected, expired
  respondedByUserId Int?      @map("responded_by_user_id")
  respondedAt       DateTime? @map("responded_at")
  responseNote      String?   @map("response_note") @db.Text
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  appointment  Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  requestedBy  User        @relation("CancellationRequester", fields: [requestedByUserId], references: [id])
  respondedBy  User?       @relation("CancellationResponder", fields: [respondedByUserId], references: [id])

  @@map("cancellation_requests")
}

/// Litige
model Dispute {
  id                Int       @id @default(autoincrement())
  appointmentId     Int       @map("appointment_id")
  openedByUserId    Int       @map("opened_by_user_id")
  type              String    @db.VarChar(50) // no_show_contested, provider_absent_contested, quality_issue, partial_service, late_cancellation_rejected, other
  description       String    @db.Text
  proofUrls         Json?     @map("proof_urls") // Array of URLs
  status            String    @default("open") @db.VarChar(20) // open, responded, escalated, resolved, closed
  responseText      String?   @map("response_text") @db.Text
  respondedAt       DateTime? @map("responded_at")
  resolvedByAdminId Int?      @map("resolved_by_admin_id")
  resolution        String?   @db.VarChar(50) // in_favor_of_opener, in_favor_of_respondent, mutual_fault, dismissed
  resolutionNote    String?   @map("resolution_note") @db.Text
  resolvedAt        DateTime? @map("resolved_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  appointment    Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  openedBy       User        @relation("DisputeOpener", fields: [openedByUserId], references: [id])
  resolvedByAdmin User?      @relation("DisputeResolver", fields: [resolvedByAdminId], references: [id])

  @@map("disputes")
}

/// Avis client sur provider
model Review {
  id               Int       @id @default(autoincrement())
  appointmentId    Int       @unique @map("appointment_id")
  clientId         Int       @map("client_id")
  providerId       Int       @map("provider_id")
  rating           Int       // 1-5
  comment          String?   @db.Text
  providerResponse String?   @map("provider_response") @db.Text
  respondedAt      DateTime? @map("responded_at")
  isVisible        Boolean   @default(false) @map("is_visible") // Visible après réponse ou 7 jours
  isReported       Boolean   @default(false) @map("is_reported")
  reportReason     String?   @map("report_reason") @db.Text
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  appointment Appointment     @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  client      User            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  provider    ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@index([providerId, isVisible])
  @@index([clientId])
  @@map("reviews")
}

/// Favoris client
model Favorite {
  id         Int      @id @default(autoincrement())
  clientId   Int      @map("client_id")
  providerId Int      @map("provider_id")
  createdAt  DateTime @default(now()) @map("created_at")

  client   User            @relation(fields: [clientId], references: [id], onDelete: Cascade)
  provider ProviderProfile @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@unique([clientId, providerId])
  @@map("favorites")
}
```

### Modifications au modèle Appointment

```prisma
model Appointment {
  // ... champs existants ...
  
  // Nouveaux champs
  reconfirmedAt       DateTime? @map("reconfirmed_at") @db.Timestamp(0)
  clientArrivedAt     DateTime? @map("client_arrived_at") @db.Timestamp(0)
  clientLateMinutes   Int?      @map("client_late_minutes")
  providerLateMinutes Int?      @map("provider_late_minutes")
  
  // Nouvelles relations
  cancellationRequest CancellationRequest?
  disputes            Dispute[]
  review              Review?
}
```

---

## Endpoints API

### Réputation

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/clients/:id/reputation` | Score et stats client |
| GET | `/providers/:id/reputation` | Score et stats provider |

### Cycle de vie RDV

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/appointments/:id/reconfirm` | Client confirme sa venue |
| POST | `/appointments/:id/arrived` | Client signale son arrivée |
| POST | `/appointments/:id/report-late` | Signaler retard (client ou provider) |
| POST | `/appointments/:id/report-absent` | Signaler absence (client ou provider) |

### Annulations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/appointments/:id/request-cancellation` | Demander annulation tardive |
| POST | `/appointments/:id/respond-cancellation` | Accepter/refuser demande |

### Litiges

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/disputes` | Ouvrir un litige |
| GET | `/disputes/:id` | Détails litige |
| POST | `/disputes/:id/respond` | Répondre au litige |
| POST | `/disputes/:id/resolve` | Résoudre (admin) |
| GET | `/users/me/disputes` | Mes litiges |

### Avis

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/appointments/:id/review` | Laisser un avis |
| PUT | `/reviews/:id` | Modifier avis (24h) |
| POST | `/reviews/:id/respond` | Répondre (provider) |
| POST | `/reviews/:id/report` | Signaler avis abusif |
| GET | `/providers/:id/reviews` | Avis d'un provider |

### Favoris

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/favorites/:providerId` | Ajouter favori |
| DELETE | `/favorites/:providerId` | Retirer favori |
| GET | `/users/me/favorites` | Liste favoris |

---

## Plan d'implémentation

### Phase 1.1 : Fondations (Priorité haute)

- [ ] Créer modèles Prisma (ClientReputation, ProviderReputation)
- [ ] Créer ReputationService
- [ ] Ajouter champs reconfirmedAt, clientArrivedAt au modèle Appointment
- [ ] Modifier statuts Appointment (ajouter reconfirmed, unconfirmed, provider_absent)

### Phase 1.2 : Cycle de vie RDV (Priorité haute)

- [ ] Endpoint reconfirmation client
- [ ] Endpoint signalement arrivée client
- [ ] Endpoint signalement retard
- [ ] Endpoint signalement absence
- [ ] Mise à jour automatique des scores

### Phase 1.3 : Annulations exceptionnelles (Priorité moyenne)

- [ ] Créer modèle CancellationRequest
- [ ] Créer CancellationRequestService
- [ ] Endpoints demande/réponse annulation

### Phase 1.4 : Litiges (Priorité moyenne)

- [ ] Créer modèle Dispute
- [ ] Créer DisputeService
- [ ] Endpoints CRUD litiges
- [ ] Interface admin résolution

### Phase 1.5 : Avis & Favoris (Priorité moyenne)

- [ ] Créer modèles Review, Favorite
- [ ] Créer ReviewService, FavoriteService
- [ ] Endpoints CRUD
- [ ] Intégration dans recherche providers

### Phase 1.6 : Notifications (Priorité moyenne)

- [ ] Rappel reconfirmation (2h avant)
- [ ] Alerte provider si pas de reconfirmation
- [ ] Notification nouveau litige
- [ ] Notification résolution litige

---

## Questions ouvertes

1. **Délai reconfirmation** : 2h avant ou configurable ?
2. **Délai réponse litige** : 48h suffisant ?
3. **Seuil suspension** : Score < 0 ou autre ?
4. **Visibilité avis** : 7 jours ou immédiat ?
5. **Limite RDV nouveaux clients** : 1 ou 2 en attente ?

---

**Document à valider avant implémentation.**
