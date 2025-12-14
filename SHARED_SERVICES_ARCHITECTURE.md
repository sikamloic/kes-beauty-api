# 🏗️ Architecture Services Partagés

## 🎯 Principe: DRY (Don't Repeat Yourself)

Éviter la duplication de code en créant **3 niveaux de services**:

1. **Common Services** - Partagés par TOUS les modules
2. **Module Shared Services** - Partagés dans un module
3. **Feature Services** - Spécifiques à une fonctionnalité

---

## 📁 Structure Complète

```
src/
├── common/
│   ├── services/
│   │   ├── phone-validation.service.ts      (~100 lignes)
│   │   ├── sms.service.ts                   (~150 lignes)
│   │   ├── email.service.ts                 (~150 lignes)
│   │   ├── file-upload.service.ts           (~200 lignes)
│   │   ├── notification.service.ts          (~180 lignes)
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── phone.util.ts                    (~230 lignes) ✅ Déjà fait
│   │   ├── date.util.ts
│   │   ├── string.util.ts
│   │   └── validation.util.ts
│   │
│   └── common.module.ts
│
├── providers/
│   ├── shared/
│   │   ├── provider-validator.service.ts    (~150 lignes)
│   │   ├── provider-repository.service.ts   (~200 lignes)
│   │   ├── provider-helper.service.ts       (~120 lignes)
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── provider-registration.service.ts (~180 lignes) ⬇️ Réduit
│   │   ├── provider-profile.service.ts      (~150 lignes) ⬇️ Réduit
│   │   └── provider-appointments.service.ts (~220 lignes) ⬇️ Réduit
│   │
│   └── providers.module.ts
```

---

## 🔧 Implémentation

### 1. Common Services (Global)

#### src/common/services/phone-validation.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PhoneUtil } from '../utils/phone.util';
import { ValidationException } from '../exceptions';

/**
 * Service de validation téléphone
 * Utilisé par: Providers, Clients, Auth, etc.
 */
@Injectable()
export class PhoneValidationService {
  /**
   * Valider et normaliser un téléphone
   */
  validateAndNormalize(phone: string): string {
    const normalized = PhoneUtil.normalize(phone);

    if (!normalized) {
      throw new ValidationException('Format de téléphone invalide', {
        phone: [
          'Formats acceptés: +2376XXXXXXXX, 2376XXXXXXXX, 002376XXXXXXXX ou 6XXXXXXXX',
        ],
      });
    }

    return normalized;
  }

  /**
   * Formater pour affichage
   */
  format(phone: string): string {
    return PhoneUtil.format(phone);
  }

  /**
   * Obtenir l'opérateur
   */
  getOperator(phone: string): string | null {
    return PhoneUtil.getOperator(phone);
  }
}
```

#### src/common/services/sms.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service SMS
 * Utilisé par: Providers, Clients, Auth, Appointments, etc.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Envoyer un SMS de vérification
   */
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    this.logger.log(`Envoi SMS vérification à ${phone}: ${code}`);
    
    // TODO: Intégration API SMS (Orange, MTN, etc.)
    // await this.smsProvider.send({
    //   to: phone,
    //   message: `Votre code de vérification: ${code}`
    // });
  }

  /**
   * Envoyer notification rendez-vous
   */
  async sendAppointmentNotification(
    phone: string,
    message: string,
  ): Promise<void> {
    this.logger.log(`Envoi notification RDV à ${phone}`);
    // TODO: Implémentation
  }

  /**
   * Générer code de vérification
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
```

#### src/common/services/file-upload.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Service upload fichiers
 * Utilisé par: Providers (documents), Services (photos), etc.
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get('UPLOAD_DIR') || './uploads';
  }

  /**
   * Upload un fichier
   */
  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; path: string }> {
    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadDir, folder, fileName);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    this.logger.log(`Fichier uploadé: ${filePath}`);

    return {
      url: `/uploads/${folder}/${fileName}`,
      path: filePath,
    };
  }

  /**
   * Supprimer un fichier
   */
  async delete(filePath: string): Promise<void> {
    await fs.unlink(filePath);
    this.logger.log(`Fichier supprimé: ${filePath}`);
  }

  /**
   * Valider le fichier
   */
  validateFile(
    file: Express.Multer.File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
    },
  ): void {
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(`Fichier trop volumineux (max: ${options.maxSize} bytes)`);
    }

    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      throw new Error(`Type de fichier non autorisé: ${file.mimetype}`);
    }
  }

  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(originalName);
    return `${timestamp}-${random}${ext}`;
  }
}
```

---

### 2. Module Shared Services (Provider)

#### src/providers/shared/provider-validator.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '../../common';

/**
 * Service de validation Provider
 * Utilisé par: Tous les services Provider
 */
@Injectable()
export class ProviderValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifier qu'un provider existe
   */
  async ensureProviderExists(providerId: number): Promise<void> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider', providerId);
    }
  }

  /**
   * Vérifier que le provider est actif
   */
  async ensureProviderIsActive(providerId: number): Promise<void> {
    const provider = await this.prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: { user: true },
    });

    if (!provider?.user.isActive) {
      throw new ConflictException(
        'Provider inactif',
        'PROVIDER_INACTIVE',
        { providerId },
      );
    }
  }

  /**
   * Vérifier que le provider est vérifié
   */
  async ensureProviderIsVerified(providerId: number): Promise<void> {
    const verification = await this.prisma.providerVerification.findUnique({
      where: { providerId },
    });

    if (verification?.status !== 'approved') {
      throw new ConflictException(
        'Provider non vérifié',
        'PROVIDER_NOT_VERIFIED',
        { providerId, status: verification?.status },
      );
    }
  }
}
```

#### src/providers/shared/provider-repository.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Repository Provider
 * Centralise les requêtes DB Provider
 * Utilisé par: Tous les services Provider
 */
@Injectable()
export class ProviderRepositoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récupérer un provider par ID
   */
  async findById(id: number) {
    return this.prisma.providerProfile.findUnique({
      where: { id },
      include: {
        user: true,
        verification: true,
        statistics: true,
      },
    });
  }

  /**
   * Récupérer un provider par userId
   */
  async findByUserId(userId: number) {
    return this.prisma.providerProfile.findUnique({
      where: { userId },
      include: {
        user: true,
        verification: true,
      },
    });
  }

  /**
   * Mettre à jour un provider
   */
  async update(id: number, data: any) {
    return this.prisma.providerProfile.update({
      where: { id },
      data,
    });
  }

  /**
   * Récupérer les statistiques
   */
  async getStatistics(providerId: number) {
    return this.prisma.providerStatistics.findUnique({
      where: { providerId },
    });
  }
}
```

---

### 3. Feature Services (Utilisation)

#### src/providers/services/provider-registration.service.ts

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ConflictException,
  PhoneValidationService,  // ✅ Common service
  SmsService,              // ✅ Common service
} from '../../common';
import { RegisterProviderDto } from '../dto';
import * as bcrypt from 'bcrypt';

/**
 * Service Inscription Provider
 * Délègue aux services partagés
 */
@Injectable()
export class ProviderRegistrationService {
  private readonly logger = new Logger(ProviderRegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneValidation: PhoneValidationService,  // ✅ Injection
    private readonly sms: SmsService,                          // ✅ Injection
  ) {}

  async register(dto: RegisterProviderDto) {
    // ✅ Délégation au service partagé
    const normalizedPhone = this.phoneValidation.validateAndNormalize(dto.phone);
    
    await this.ensurePhoneIsUnique(normalizedPhone);
    const passwordHash = await this.hashPassword(dto.password);
    
    const result = await this.createProviderInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });

    // ✅ Délégation au service SMS
    const code = this.sms.generateVerificationCode();
    await this.sms.sendVerificationCode(normalizedPhone, code);

    this.logger.log(`Provider créé: ID=${result.providerId}`);

    return this.buildRegistrationResponse(result, dto);
  }

  // Méthodes privées spécifiques à l'inscription
  private async ensurePhoneIsUnique(phone: string): Promise<void> { /* ... */ }
  private async hashPassword(password: string): Promise<string> { /* ... */ }
  private async createProviderInTransaction(data: any) { /* ... */ }
  private buildRegistrationResponse(result: any, dto: any) { /* ... */ }
}
```

#### src/providers/services/provider-profile.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import {
  PhoneValidationService,      // ✅ Common service
  FileUploadService,            // ✅ Common service
} from '../../common';
import {
  ProviderValidatorService,     // ✅ Module shared service
  ProviderRepositoryService,    // ✅ Module shared service
} from '../shared';

@Injectable()
export class ProviderProfileService {
  constructor(
    private readonly phoneValidation: PhoneValidationService,
    private readonly fileUpload: FileUploadService,
    private readonly providerValidator: ProviderValidatorService,
    private readonly providerRepository: ProviderRepositoryService,
  ) {}

  async updateProfile(providerId: number, dto: UpdateProfileDto) {
    // ✅ Délégation aux services partagés
    await this.providerValidator.ensureProviderExists(providerId);
    
    if (dto.phone) {
      dto.phone = this.phoneValidation.validateAndNormalize(dto.phone);
    }

    return this.providerRepository.update(providerId, dto);
  }

  async uploadDocument(providerId: number, file: Express.Multer.File, type: string) {
    await this.providerValidator.ensureProviderExists(providerId);
    
    // ✅ Délégation au service upload
    this.fileUpload.validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    });

    const { url, path } = await this.fileUpload.upload(file, 'provider-documents');

    // Créer enregistrement document
    return this.createDocumentRecord(providerId, type, url, path, file);
  }

  private async createDocumentRecord(/* ... */) { /* ... */ }
}
```

---

## 📊 Résultat Final

### Avant (Duplication)
```
provider-registration.service.ts    (250 lignes)
  - validatePhone() 15 lignes
  - sendSMS() 20 lignes
  - uploadFile() 25 lignes

provider-profile.service.ts         (200 lignes)
  - validatePhone() 15 lignes       ❌ DUPLIQUÉ
  - sendSMS() 20 lignes             ❌ DUPLIQUÉ
  - uploadFile() 25 lignes          ❌ DUPLIQUÉ

provider-verification.service.ts    (180 lignes)
  - validatePhone() 15 lignes       ❌ DUPLIQUÉ
  - sendSMS() 20 lignes             ❌ DUPLIQUÉ

Total: 630 lignes (180 lignes dupliquées)
```

### Après (Services Partagés)
```
common/services/
  phone-validation.service.ts       (100 lignes) ✅
  sms.service.ts                    (150 lignes) ✅
  file-upload.service.ts            (200 lignes) ✅

providers/shared/
  provider-validator.service.ts     (150 lignes) ✅
  provider-repository.service.ts    (200 lignes) ✅

providers/services/
  provider-registration.service.ts  (120 lignes) ⬇️ -52%
  provider-profile.service.ts       (100 lignes) ⬇️ -50%
  provider-verification.service.ts  (80 lignes)  ⬇️ -56%

Total: 1,100 lignes (0 duplication)
```

---

## ✅ Avantages

1. **DRY** - Zéro duplication
2. **Testabilité** - Services isolés faciles à tester
3. **Réutilisabilité** - Common services utilisables partout
4. **Maintenabilité** - 1 bug fix = tous les modules bénéficient
5. **SOLID** - Respect strict de SRP et DIP

---

## 🎯 Règles d'Or

1. **Common Services** = Logique utilisée par 2+ modules
2. **Module Shared** = Logique utilisée par 2+ services du module
3. **Feature Service** = Logique spécifique à 1 fonctionnalité
4. **Pas de duplication** - Si copier/coller → créer service partagé
5. **Injection de dépendances** - Toujours injecter, jamais instancier

**Cette architecture évite la duplication tout en gardant les services légers!** 🎯
