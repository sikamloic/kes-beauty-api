# 📅 Système de Gestion des Disponibilités Provider

Documentation complète du système de gestion des horaires et disponibilités des providers.

---

## 📋 Vue d'Ensemble

Le système de disponibilités permet aux providers de:
- ✅ Définir leurs **horaires réguliers** hebdomadaires
- ✅ Gérer des **exceptions** (congés, horaires spéciaux)
- ✅ Activer/désactiver des jours spécifiques
- ✅ Vérifier la disponibilité pour un créneau donné

---

## 🗄️ Architecture Base de Données

### Table: `provider_availabilities`

**Horaires réguliers hebdomadaires**

```sql
CREATE TABLE provider_availabilities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  day_of_week INT NOT NULL,              -- 0=Dimanche, 1=Lundi, ..., 6=Samedi
  start_time VARCHAR(5) NOT NULL,        -- Format HH:mm (ex: "09:00")
  end_time VARCHAR(5) NOT NULL,          -- Format HH:mm (ex: "17:00")
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE (provider_id, day_of_week, start_time)
);
```

**Exemple de données:**
```
provider_id | day_of_week | start_time | end_time | is_active
------------|-------------|------------|----------|----------
1           | 1 (Lundi)   | 09:00      | 12:00    | true
1           | 1 (Lundi)   | 14:00      | 18:00    | true
1           | 2 (Mardi)   | 10:00      | 17:00    | true
```

### Table: `provider_availability_exceptions`

**Exceptions aux horaires réguliers**

```sql
CREATE TABLE provider_availability_exceptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  date DATE NOT NULL,                    -- Date de l'exception
  type VARCHAR(20) NOT NULL,             -- 'unavailable' ou 'custom_hours'
  start_time VARCHAR(5) NULL,            -- Si custom_hours
  end_time VARCHAR(5) NULL,              -- Si custom_hours
  reason VARCHAR(255) NULL,
  created_at TIMESTAMP,
  
  UNIQUE (provider_id, date)
);
```

**Types d'exceptions:**
- `unavailable`: Provider indisponible toute la journée (congé, jour férié)
- `custom_hours`: Horaires spéciaux pour cette date (formation, événement)

---

## 🎯 Fonctionnalités

### 1. Définir Horaires Hebdomadaires

**Endpoint:** `POST /providers/availability/weekly`

**Exemple:**
```json
{
  "days": [
    {
      "dayOfWeek": 1,
      "slots": [
        { "startTime": "09:00", "endTime": "12:00" },
        { "startTime": "14:00", "endTime": "18:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "slots": [
        { "startTime": "10:00", "endTime": "17:00" }
      ],
      "isActive": true
    }
  ]
}
```

**Comportement:**
- ✅ Remplace **toutes** les disponibilités existantes
- ✅ Permet plusieurs créneaux par jour (ex: matin + après-midi)
- ✅ Validation: `endTime` doit être après `startTime`

---

### 2. Récupérer Horaires Hebdomadaires

**Endpoint:** `GET /providers/availability/weekly`

**Réponse:**
```json
{
  "success": true,
  "data": {
    "days": [
      {
        "dayOfWeek": 1,
        "isActive": true,
        "slots": [
          { "startTime": "09:00", "endTime": "12:00" },
          { "startTime": "14:00", "endTime": "18:00" }
        ]
      },
      {
        "dayOfWeek": 2,
        "isActive": true,
        "slots": [
          { "startTime": "10:00", "endTime": "17:00" }
        ]
      }
    ]
  }
}
```

---

### 3. Activer/Désactiver un Jour

**Endpoint:** `PUT /providers/availability/weekly/day/:dayOfWeek/toggle`

**Body:**
```json
{
  "isActive": false
}
```

**Cas d'usage:**
- Fermeture temporaire d'un jour (ex: tous les lundis fermés)
- Réactivation rapide sans recréer les horaires

---

### 4. Créer une Exception

**Endpoint:** `POST /providers/availability/exceptions`

**Type 1: Indisponible (congé)**
```json
{
  "date": "2024-12-25",
  "type": "unavailable",
  "reason": "Jour férié - Noël"
}
```

**Type 2: Horaires spéciaux**
```json
{
  "date": "2024-12-24",
  "type": "custom_hours",
  "startTime": "09:00",
  "endTime": "14:00",
  "reason": "Fermeture anticipée - Réveillon"
}
```

---

### 5. Liste des Exceptions

**Endpoint:** `GET /providers/availability/exceptions`

**Query Parameters:**
- `startDate` (optionnel): Date début (YYYY-MM-DD)
- `endDate` (optionnel): Date fin (YYYY-MM-DD)

**Exemple:**
```
GET /providers/availability/exceptions?startDate=2024-12-01&endDate=2024-12-31
```

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2024-12-24",
      "type": "custom_hours",
      "startTime": "09:00",
      "endTime": "14:00",
      "reason": "Fermeture anticipée",
      "createdAt": "2024-12-01T10:00:00Z"
    },
    {
      "id": 2,
      "date": "2024-12-25",
      "type": "unavailable",
      "startTime": null,
      "endTime": null,
      "reason": "Jour férié - Noël",
      "createdAt": "2024-12-01T10:05:00Z"
    }
  ]
}
```

---

### 6. Mettre à Jour une Exception

**Endpoint:** `PUT /providers/availability/exceptions/:id`

**Body:**
```json
{
  "type": "custom_hours",
  "startTime": "10:00",
  "endTime": "15:00",
  "reason": "Formation professionnelle"
}
```

---

### 7. Supprimer une Exception

**Endpoint:** `DELETE /providers/availability/exceptions/:id`

---

## 🔍 Vérification de Disponibilité

### Méthode: `isAvailable()`

**Logique de vérification:**

```typescript
async isAvailable(
  providerId: number,
  date: Date,
  startTime: string,
  endTime: string
): Promise<boolean>
```

**Algorithme:**

1. **Vérifier exceptions d'abord:**
   - Si exception `unavailable` → `false`
   - Si exception `custom_hours` → vérifier si créneau dans les horaires spéciaux

2. **Sinon, vérifier horaires réguliers:**
   - Récupérer jour de la semaine (0-6)
   - Chercher créneaux actifs pour ce jour
   - Vérifier si créneau demandé est dans un des créneaux disponibles

**Exemple d'utilisation:**
```typescript
const isAvailable = await availabilityService.isAvailable(
  providerId: 1,
  date: new Date('2024-12-15'),
  startTime: '10:00',
  endTime: '11:00'
);
// true ou false
```

---

## 📊 Cas d'Usage Complets

### Cas 1: Provider avec Pause Déjeuner

**Configuration:**
```json
{
  "days": [
    {
      "dayOfWeek": 1,
      "slots": [
        { "startTime": "08:00", "endTime": "12:00" },
        { "startTime": "13:30", "endTime": "18:00" }
      ]
    }
  ]
}
```

**Disponibilités:**
- ✅ 08:00 - 12:00
- ❌ 12:00 - 13:30 (pause)
- ✅ 13:30 - 18:00

---

### Cas 2: Congés de Noël

**Horaires réguliers:** Lundi-Vendredi 9h-17h

**Exceptions:**
```json
[
  {
    "date": "2024-12-24",
    "type": "custom_hours",
    "startTime": "09:00",
    "endTime": "14:00",
    "reason": "Fermeture anticipée"
  },
  {
    "date": "2024-12-25",
    "type": "unavailable",
    "reason": "Jour férié - Noël"
  },
  {
    "date": "2024-12-26",
    "type": "unavailable",
    "reason": "Jour férié - Boxing Day"
  }
]
```

**Résultat:**
- 24 déc: Disponible 9h-14h uniquement
- 25 déc: Indisponible toute la journée
- 26 déc: Indisponible toute la journée
- 27 déc: Horaires normaux (9h-17h)

---

### Cas 3: Fermeture Temporaire d'un Jour

**Scénario:** Provider ferme tous les lundis pendant 1 mois

**Option 1: Désactiver le jour**
```
PUT /providers/availability/weekly/day/1/toggle
{ "isActive": false }
```

**Option 2: Créer exceptions**
```json
[
  { "date": "2024-12-02", "type": "unavailable", "reason": "Fermé" },
  { "date": "2024-12-09", "type": "unavailable", "reason": "Fermé" },
  { "date": "2024-12-16", "type": "unavailable", "reason": "Fermé" },
  { "date": "2024-12-23", "type": "unavailable", "reason": "Fermé" }
]
```

**Recommandation:** Option 1 si fermeture récurrente, Option 2 si dates spécifiques

---

## 🎨 Workflow Frontend

### Affichage Calendrier

```typescript
// 1. Récupérer horaires hebdomadaires
const weekly = await fetch('/providers/availability/weekly');

// 2. Récupérer exceptions du mois
const exceptions = await fetch(
  '/providers/availability/exceptions?startDate=2024-12-01&endDate=2024-12-31'
);

// 3. Pour chaque jour du calendrier:
function isAvailableOnDate(date: Date): boolean {
  // Vérifier exception d'abord
  const exception = exceptions.find(ex => ex.date === formatDate(date));
  if (exception) {
    return exception.type === 'custom_hours';
  }
  
  // Sinon vérifier horaires réguliers
  const dayOfWeek = date.getDay();
  const daySchedule = weekly.days.find(d => d.dayOfWeek === dayOfWeek);
  return daySchedule?.isActive && daySchedule.slots.length > 0;
}
```

---

### Sélection Créneau

```typescript
function getAvailableSlots(date: Date): TimeSlot[] {
  const dayOfWeek = date.getDay();
  
  // Vérifier exception
  const exception = exceptions.find(ex => ex.date === formatDate(date));
  if (exception) {
    if (exception.type === 'unavailable') return [];
    return [{ 
      startTime: exception.startTime, 
      endTime: exception.endTime 
    }];
  }
  
  // Horaires réguliers
  const daySchedule = weekly.days.find(d => d.dayOfWeek === dayOfWeek);
  return daySchedule?.slots || [];
}
```

---

## ✅ Validation et Règles Métier

### Règles de Validation

**Horaires:**
- ✅ Format HH:mm (ex: "09:00", "17:30")
- ✅ `endTime` > `startTime`
- ✅ `dayOfWeek` entre 0 et 6
- ✅ Au moins 1 créneau par jour

**Exceptions:**
- ✅ Date au format YYYY-MM-DD
- ✅ Si `type=custom_hours` → `startTime` et `endTime` requis
- ✅ Une seule exception par date
- ✅ `endTime` > `startTime`

### Contraintes Base de Données

```sql
-- Unicité: Un seul créneau identique par provider/jour
UNIQUE (provider_id, day_of_week, start_time)

-- Unicité: Une seule exception par provider/date
UNIQUE (provider_id, date)
```

---

## 🔐 Sécurité

**Authentification:**
- ✅ Tous les endpoints nécessitent JWT Bearer token
- ✅ Role `provider` requis
- ✅ Provider ne peut modifier que ses propres disponibilités

**Validation:**
- ✅ DTOs avec class-validator
- ✅ Vérification ownership (providerId)
- ✅ Validation formats horaires (regex)

---

## 📈 Performance

**Indexes:**
```sql
-- Recherche par provider et jour
INDEX idx_provider_day_active (provider_id, day_of_week, is_active)

-- Recherche exceptions par provider et date
INDEX idx_provider_date (provider_id, date)

-- Recherche exceptions par date et type
INDEX idx_date_type (date, type)
```

**Optimisations:**
- ✅ Requêtes groupées par jour
- ✅ Indexes sur colonnes de recherche
- ✅ Pas de soft delete (hard delete pour disponibilités)

---

## 🚀 Intégration avec Rendez-vous

### Vérification avant Création Rendez-vous

```typescript
// Dans AppointmentsService
async createAppointment(dto: CreateAppointmentDto) {
  // 1. Vérifier disponibilité provider
  const isAvailable = await this.availabilityService.isAvailable(
    dto.providerId,
    dto.scheduledAt,
    dto.startTime,
    dto.endTime
  );
  
  if (!isAvailable) {
    throw new BadRequestException('Provider non disponible à ce créneau');
  }
  
  // 2. Vérifier pas de conflit avec autres rendez-vous
  const hasConflict = await this.checkAppointmentConflict(
    dto.providerId,
    dto.scheduledAt,
    dto.startTime,
    dto.endTime
  );
  
  if (hasConflict) {
    throw new ConflictException('Créneau déjà réservé');
  }
  
  // 3. Créer rendez-vous
  return this.createAppointment(dto);
}
```

---

## 📝 Exemples Complets

### Exemple 1: Configuration Salon de Coiffure

```json
{
  "days": [
    {
      "dayOfWeek": 1,
      "slots": [
        { "startTime": "09:00", "endTime": "12:30" },
        { "startTime": "14:00", "endTime": "19:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "slots": [
        { "startTime": "09:00", "endTime": "12:30" },
        { "startTime": "14:00", "endTime": "19:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "slots": [
        { "startTime": "09:00", "endTime": "12:30" },
        { "startTime": "14:00", "endTime": "19:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 4,
      "slots": [
        { "startTime": "09:00", "endTime": "12:30" },
        { "startTime": "14:00", "endTime": "19:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 5,
      "slots": [
        { "startTime": "09:00", "endTime": "12:30" },
        { "startTime": "14:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 6,
      "slots": [
        { "startTime": "10:00", "endTime": "18:00" }
      ],
      "isActive": true
    }
  ]
}
```

**Horaires:**
- Lundi-Jeudi: 9h-12h30, 14h-19h
- Vendredi: 9h-12h30, 14h-20h
- Samedi: 10h-18h (sans pause)
- Dimanche: Fermé

---

### Exemple 2: Provider à Domicile

```json
{
  "days": [
    {
      "dayOfWeek": 1,
      "slots": [
        { "startTime": "08:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 2,
      "slots": [
        { "startTime": "08:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "slots": [
        { "startTime": "08:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 4,
      "slots": [
        { "startTime": "08:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 5,
      "slots": [
        { "startTime": "08:00", "endTime": "20:00" }
      ],
      "isActive": true
    },
    {
      "dayOfWeek": 6,
      "slots": [
        { "startTime": "09:00", "endTime": "17:00" }
      ],
      "isActive": true
    }
  ]
}
```

**Horaires:**
- Lundi-Vendredi: 8h-20h (flexibilité déplacements)
- Samedi: 9h-17h
- Dimanche: Fermé

---

## 🎯 Prochaines Évolutions

### Fonctionnalités Futures

- [ ] **Créneaux récurrents:** Répéter exceptions (ex: fermé tous les lundis de janvier)
- [ ] **Buffer time:** Temps de préparation entre rendez-vous
- [ ] **Durée minimale/maximale:** Par service
- [ ] **Disponibilités par service:** Horaires différents selon services
- [ ] **Notifications:** Alertes avant exceptions (rappel congés)
- [ ] **Import/Export:** Calendrier iCal
- [ ] **Templates:** Modèles de disponibilités prédéfinis

---

**Dernière mise à jour:** 2024-12-04

**Statut:** ✅ Production-ready
