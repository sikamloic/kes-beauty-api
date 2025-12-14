# 🛡️ Système Centralisé de Gestion des Erreurs

## Architecture SOLID

Ce système respecte **tous les principes SOLID**:

### 1. **SRP (Single Responsibility Principle)**
- `GlobalExceptionFilter` → Responsabilité unique: transformer exceptions en réponses HTTP
- `LoggingInterceptor` → Responsabilité unique: logger les requêtes/réponses
- Chaque exception custom a 1 responsabilité claire

### 2. **OCP (Open/Closed Principle)**
- `BaseException` → Classe abstraite ouverte à l'extension
- Ajout nouvelle exception = créer classe héritant de `BaseException`, pas de modification existant
- Exemple:
```typescript
export class PaymentException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PAYMENT_ERROR', HttpStatus.PAYMENT_REQUIRED, details);
  }
}
```

### 3. **LSP (Liskov Substitution Principle)**
- Toutes les exceptions custom sont substituables à `BaseException`
- `GlobalExceptionFilter` traite uniformément toutes les exceptions

### 4. **ISP (Interface Segregation Principle)**
- `ErrorResponseDto` → Interface minimale pour réponses erreur
- `ValidationErrorResponseDto` → Interface spécialisée pour erreurs validation
- Pas de propriétés inutiles forcées

### 5. **DIP (Dependency Inversion Principle)**
- `GlobalExceptionFilter` dépend de l'abstraction `BaseException`, pas d'implémentations concrètes
- Facilite tests et mocking

---

## 📁 Structure

```
common/
├── exceptions/
│   ├── base.exception.ts           # Classe abstraite de base (OCP)
│   ├── business.exception.ts       # Exceptions métier
│   ├── technical.exception.ts      # Exceptions techniques
│   └── index.ts                    # Barrel export
├── filters/
│   └── global-exception.filter.ts  # Filter global (SRP)
├── interceptors/
│   └── logging.interceptor.ts      # Intercepteur logging (SRP)
├── dto/
│   └── error-response.dto.ts       # DTOs réponses (ISP)
├── index.ts                        # Barrel export global
└── README.md                       # Cette doc
```

---

## 🎯 Hiérarchie des Exceptions

```
BaseException (abstract)
├── BusinessException
│   ├── NotFoundException
│   ├── ConflictException
│   ├── ValidationException
│   ├── ForbiddenException
│   └── UnauthorizedException
└── TechnicalException
    ├── DatabaseException
    ├── ExternalServiceException
    ├── ConfigurationException
    └── TimeoutException
```

---

## 💡 Utilisation

### 1. Lancer une Exception Custom

```typescript
import { NotFoundException, ConflictException } from '@/common';

// Ressource non trouvée
throw new NotFoundException('Appointment', appointmentId);

// Conflit (double booking)
throw new ConflictException('Créneau déjà réservé', 'SLOT_ALREADY_BOOKED', {
  providerId,
  scheduledAt,
});

// Validation métier
throw new ValidationException('Données invalides', {
  phone: ['Format invalide'],
  email: ['Email déjà utilisé'],
});
```

### 2. Créer une Exception Custom

```typescript
import { BaseException } from '@/common';
import { HttpStatus } from '@nestjs/common';

export class AppointmentException extends BaseException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'APPOINTMENT_ERROR', HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

// Utilisation
throw new AppointmentException('Impossible de réserver dans le passé', {
  requestedDate: scheduledAt,
  currentDate: new Date(),
});
```

### 3. Try-Catch Centralisé

**❌ AVANT (répétitif):**
```typescript
async createAppointment(dto: CreateAppointmentDto) {
  try {
    // Logique métier
    const appointment = await this.repo.save(dto);
    return appointment;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('Créneau déjà réservé');
    }
    throw new InternalServerErrorException('Erreur création RDV');
  }
}
```

**✅ APRÈS (centralisé):**
```typescript
async createAppointment(dto: CreateAppointmentDto) {
  // Validation métier
  const existingSlot = await this.checkSlotAvailability(dto);
  if (existingSlot) {
    throw new ConflictException('Créneau déjà réservé', 'SLOT_ALREADY_BOOKED');
  }

  // Pas de try-catch, GlobalExceptionFilter gère tout
  return this.repo.save(dto);
}
```

### 4. Gestion Erreurs Base de Données

```typescript
import { DatabaseException } from '@/common';

async findProviderById(id: number) {
  try {
    return await this.repo.findOneOrFail({ where: { id } });
  } catch (error) {
    if (error.name === 'EntityNotFoundError') {
      throw new NotFoundException('Provider', id);
    }
    throw new DatabaseException('Erreur lecture provider', error);
  }
}
```

### 5. Gestion Erreurs API Externe

```typescript
import { ExternalServiceException, TimeoutException } from '@/common';

async processPayment(amount: number, phone: string) {
  try {
    const response = await this.orangeMoneyApi.initiate(amount, phone);
    return response;
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      throw new TimeoutException('Orange Money payment', 30000);
    }
    throw new ExternalServiceException('Orange Money', error.message, {
      amount,
      phone,
    });
  }
}
```

---

## 📊 Format Réponse Erreur

### Succès (200-299)
```json
{
  "id": 1,
  "status": "confirmed",
  "scheduledAt": "2025-01-25T10:00:00Z"
}
```

### Erreur Business (400, 404, 409, 422)
```json
{
  "statusCode": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Appointment avec l'identifiant '123' introuvable",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/appointments/123",
  "details": {
    "resource": "Appointment",
    "identifier": "123"
  }
}
```

### Erreur Validation (400)
```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Données invalides",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/appointments",
  "details": {
    "validationErrors": {
      "phone": ["Format invalide", "Numéro requis"],
      "scheduledAt": ["Date dans le passé"]
    }
  }
}
```

### Erreur Technique (500)
```json
{
  "statusCode": 500,
  "code": "DATABASE_ERROR",
  "message": "Erreur lecture provider",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "path": "/api/v1/providers/1",
  "details": {
    "originalError": "Connection timeout"
  }
}
```

---

## 🔍 Logging

### Requête Entrante
```
[HTTP] → POST /api/v1/appointments | IP: 192.168.1.1 | UA: Mozilla/5.0...
```

### Réponse Succès
```
[HTTP] ← POST /api/v1/appointments | Status: 201 | Duration: 145ms
```

### Erreur 4xx (Warning)
```
[GlobalExceptionFilter] RESOURCE_NOT_FOUND: Appointment avec l'identifiant '123' introuvable
{"method":"GET","url":"/api/v1/appointments/123","statusCode":404}
```

### Erreur 5xx (Error avec stack)
```
[GlobalExceptionFilter] DATABASE_ERROR: Erreur lecture provider
Error: Connection timeout
    at Repository.findOne (...)
    at ProviderService.findById (...)
{"method":"GET","url":"/api/v1/providers/1","statusCode":500}
```

---

## ✅ Avantages

1. **Centralisation** - Plus de try-catch répétitifs
2. **Cohérence** - Format réponse uniforme
3. **Traçabilité** - Logs structurés avec contexte
4. **Maintenabilité** - Facile d'ajouter nouvelles exceptions
5. **Testabilité** - Exceptions mockables facilement
6. **Production-ready** - Stack traces masquées en prod
7. **SOLID** - Respect total des principes

---

## 🚀 Prochaines Étapes

1. ✅ Hiérarchie exceptions créée
2. ✅ GlobalExceptionFilter implémenté
3. ✅ LoggingInterceptor implémenté
4. ✅ Intégration dans main.ts
5. ⏳ Créer exceptions métier spécifiques (AppointmentException, PaymentException, etc.)
6. ⏳ Ajouter monitoring (Sentry, DataDog)
7. ⏳ Ajouter métriques erreurs (Prometheus)
