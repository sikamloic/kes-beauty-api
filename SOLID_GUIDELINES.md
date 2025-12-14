# 🎯 Guidelines SOLID - Éviter Super Fichiers & Super Méthodes

## ❌ À Éviter

### Super Fichiers (> 300 lignes)
```typescript
// ❌ MAUVAIS: providers.service.ts (800 lignes)
class ProvidersService {
  register() { /* 100 lignes */ }
  update() { /* 80 lignes */ }
  delete() { /* 50 lignes */ }
  findById() { /* 60 lignes */ }
  findAll() { /* 70 lignes */ }
  verify() { /* 90 lignes */ }
  uploadDocument() { /* 120 lignes */ }
  // ... 15 autres méthodes
}
```

### Super Méthodes (> 30 lignes)
```typescript
// ❌ MAUVAIS: Méthode qui fait tout
async register(dto: RegisterDto) {
  // Validation téléphone (10 lignes)
  const phone = dto.phone;
  if (!phone.startsWith('+237')) { /* ... */ }
  
  // Vérification unicité (15 lignes)
  const existing = await this.prisma.user.findUnique({ /* ... */ });
  if (existing) { /* ... */ }
  
  // Hash password (5 lignes)
  const hash = await bcrypt.hash(/* ... */);
  
  // Transaction (40 lignes)
  const result = await this.prisma.$transaction(async (tx) => {
    // Créer user
    const user = await tx.user.create({ /* ... */ });
    
    // Attribuer rôle
    const role = await tx.role.findUnique({ /* ... */ });
    await tx.userRole.create({ /* ... */ });
    
    // Créer profil
    const profile = await tx.providerProfile.create({ /* ... */ });
    
    // Créer vérification
    await tx.providerVerification.create({ /* ... */ });
    
    // Créer statistiques
    await tx.providerStatistics.create({ /* ... */ });
    
    return { user, profile };
  });
  
  // Formatage réponse (10 lignes)
  return {
    userId: result.user.id,
    // ... 15 autres champs
  };
}
```

---

## ✅ À Faire

### 1. Découper en Petites Méthodes Privées

```typescript
// ✅ BON: Méthode publique = orchestration (< 15 lignes)
async register(dto: RegisterProviderDto) {
  const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
  await this.ensurePhoneIsUnique(normalizedPhone);
  const passwordHash = await this.hashPassword(dto.password);
  const result = await this.createProviderInTransaction({
    ...dto,
    phone: normalizedPhone,
    passwordHash,
  });
  return this.buildRegistrationResponse(result, dto);
}

// ✅ Méthodes privées focalisées (< 20 lignes chacune)
private validateAndNormalizePhone(phone: string): string {
  const normalized = PhoneUtil.normalize(phone);
  if (!normalized) {
    throw new ValidationException('Format invalide');
  }
  return normalized;
}

private async ensurePhoneIsUnique(phone: string): Promise<void> {
  const existing = await this.prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new ConflictException('Téléphone déjà utilisé');
  }
}

private async hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

private async createProviderInTransaction(data: any) {
  return this.prisma.$transaction(async (tx) => {
    const user = await this.createUser(tx, data);
    await this.assignProviderRole(tx, user.id);
    const profile = await this.createProviderProfile(tx, user.id, data);
    await this.createVerificationRecord(tx, profile.id);
    await this.createStatisticsRecord(tx, profile.id);
    return { userId: user.id, providerId: profile.id, phone: user.phone };
  });
}

// Chaque création = 1 méthode privée (< 15 lignes)
private async createUser(tx: any, data: any) { /* ... */ }
private async assignProviderRole(tx: any, userId: number) { /* ... */ }
private async createProviderProfile(tx: any, userId: number, data: any) { /* ... */ }
private async createVerificationRecord(tx: any, providerId: number) { /* ... */ }
private async createStatisticsRecord(tx: any, providerId: number) { /* ... */ }

private buildRegistrationResponse(result: any, dto: any) { /* ... */ }
```

### 2. Déléguer aux Utils/Helpers

```typescript
// ✅ BON: Délégation à PhoneUtil
private validateAndNormalizePhone(phone: string): string {
  const normalized = PhoneUtil.normalize(phone); // Délégation
  if (!normalized) {
    throw new ValidationException('Format invalide');
  }
  return normalized;
}

// Au lieu de:
// ❌ MAUVAIS: Tout faire dans le service
private validatePhone(phone: string): string {
  // 30 lignes de regex et validation ici...
}
```

### 3. Limites par Fichier

| Type | Limite Lignes | Limite Méthodes |
|------|---------------|-----------------|
| **Controller** | < 100 | < 5 endpoints |
| **Service** | < 300 | < 10 méthodes publiques |
| **Util/Helper** | < 200 | < 8 fonctions |
| **DTO** | < 100 | N/A |

### 4. Règles par Méthode

| Type Méthode | Limite Lignes | Responsabilité |
|--------------|---------------|----------------|
| **Publique** | < 20 | Orchestration uniquement |
| **Privée** | < 15 | 1 action spécifique |
| **Helper** | < 10 | 1 transformation simple |

---

## 📋 Checklist SOLID

### Single Responsibility Principle (SRP)
- [ ] Chaque méthode fait **UNE SEULE CHOSE**
- [ ] Nom de méthode = verbe d'action clair (`validate`, `create`, `ensure`)
- [ ] Méthode publique = orchestration, pas de logique
- [ ] Méthodes privées = logique focalisée

### Open/Closed Principle (OCP)
- [ ] Extensible sans modifier le code existant
- [ ] Utiliser injection de dépendances
- [ ] Pas de if/else géants, préférer polymorphisme

### Liskov Substitution Principle (LSP)
- [ ] Les interfaces sont respectées
- [ ] Pas de surprises dans les implémentations

### Interface Segregation Principle (ISP)
- [ ] Pas d'interfaces trop larges
- [ ] Clients ne dépendent que de ce qu'ils utilisent

### Dependency Inversion Principle (DIP)
- [ ] Dépendre d'abstractions (interfaces)
- [ ] Pas de dépendances concrètes hardcodées

---

## 🎯 Exemple Complet: ProvidersService

```typescript
@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ Méthode publique: orchestration (13 lignes)
  async register(dto: RegisterProviderDto) {
    const normalizedPhone = this.validateAndNormalizePhone(dto.phone);
    await this.ensurePhoneIsUnique(normalizedPhone);
    const passwordHash = await this.hashPassword(dto.password);
    const result = await this.createProviderInTransaction({
      ...dto,
      phone: normalizedPhone,
      passwordHash,
    });
    return this.buildRegistrationResponse(result, dto);
  }

  // ✅ Méthodes privées: focalisées (< 15 lignes chacune)
  private validateAndNormalizePhone(phone: string): string { /* ... */ }
  private async ensurePhoneIsUnique(phone: string): Promise<void> { /* ... */ }
  private async hashPassword(password: string): Promise<string> { /* ... */ }
  private async createProviderInTransaction(data: any) { /* ... */ }
  private async createUser(tx: any, data: any) { /* ... */ }
  private async assignProviderRole(tx: any, userId: number) { /* ... */ }
  private async createProviderProfile(tx: any, userId: number, data: any) { /* ... */ }
  private async createVerificationRecord(tx: any, providerId: number) { /* ... */ }
  private async createStatisticsRecord(tx: any, providerId: number) { /* ... */ }
  private buildRegistrationResponse(result: any, dto: any) { /* ... */ }
}

// Total: ~200 lignes, 10 méthodes privées, 1 méthode publique
// ✅ Maintenable, testable, lisible
```

---

## 🚨 Signaux d'Alerte

### Quand Refactorer?

| Signal | Action |
|--------|--------|
| **Méthode > 30 lignes** | Découper en méthodes privées |
| **Service > 300 lignes** | Extraire en services séparés |
| **Méthode fait 3+ choses** | Appliquer SRP |
| **Code dupliqué** | Extraire en helper/util |
| **Difficile à tester** | Trop de responsabilités |
| **Difficile à nommer** | Responsabilité pas claire |

---

## ✅ Résumé

**Garder:**
- ✅ Structure classique Controller → Service
- ✅ Fichiers services existants

**Appliquer:**
- ✅ **Petites méthodes** (< 20 lignes)
- ✅ **SRP strict** (1 méthode = 1 chose)
- ✅ **Délégation** (utils/helpers)
- ✅ **Orchestration** (méthodes publiques)
- ✅ **Logique focalisée** (méthodes privées)

**Résultat:**
- ✅ Code **maintenable**
- ✅ Code **testable**
- ✅ Code **lisible**
- ✅ Pas de super fichiers
- ✅ Pas de super méthodes
