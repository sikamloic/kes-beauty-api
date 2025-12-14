# 📊 Mises à Jour Base de Données

## ✅ Ajout Table `refresh_tokens`

### Date
2024-11-24

### Objectif
Stocker les refresh tokens JWT pour:
- ✅ Révocation tokens (logout)
- ✅ Déconnexion de tous les appareils
- ✅ Limiter nombre d'appareils connectés
- ✅ Voir sessions actives
- ✅ Détecter tokens volés

---

## 📋 Schéma Table

```sql
CREATE TABLE refresh_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Token
  token VARCHAR(500) UNIQUE NOT NULL,
  user_id INT NOT NULL,
  
  -- Métadonnées
  device_info VARCHAR(255),      -- User-Agent
  ip_address VARCHAR(45),        -- IPv4/IPv6
  
  -- Dates
  expires_at TIMESTAMP NOT NULL, -- Expiration (7j)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Révocation
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_revoked (is_revoked, expires_at)
);
```

---

## 🔧 Fichiers Modifiés

### 1. `database-schema-mvp.sql`
- ✅ Ajout DROP TABLE refresh_tokens
- ✅ Ajout CREATE TABLE refresh_tokens (après user_roles)

### 2. `prisma/schema.prisma`
- ✅ Ajout model RefreshToken
- ✅ Ajout relation refreshTokens dans User

### 3. `migrations/add_refresh_tokens.sql`
- ✅ Script migration SQL standalone

---

## 🚀 Appliquer la Migration

### Option 1: SQL Direct
```bash
mysql -u root -p kes_beauty_db < migrations/add_refresh_tokens.sql
```

### Option 2: Prisma (si BD démarrée)
```bash
npx prisma migrate dev --name add_refresh_tokens
```

### Option 3: Node.js Script
```bash
node migrations/apply-refresh-tokens.js
```

---

## 📊 Vérification

### Vérifier table créée
```sql
SHOW TABLES LIKE 'refresh_tokens';
```

### Vérifier structure
```sql
DESCRIBE refresh_tokens;
```

### Vérifier index
```sql
SHOW INDEX FROM refresh_tokens;
```

---

## 🔒 Utilisation

### Créer Token
```typescript
await prisma.refreshToken.create({
  data: {
    token: 'eyJhbGc...',
    userId: 1,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    deviceInfo: 'Mozilla/5.0...',
    ipAddress: '192.168.1.10',
  },
});
```

### Vérifier Token
```typescript
const token = await prisma.refreshToken.findUnique({
  where: { token: 'eyJhbGc...' },
});

if (!token || token.isRevoked || token.expiresAt < new Date()) {
  throw new Error('Token invalide');
}
```

### Révoquer Token
```typescript
await prisma.refreshToken.update({
  where: { token: 'eyJhbGc...' },
  data: {
    isRevoked: true,
    revokedAt: new Date(),
  },
});
```

### Révoquer Tous les Tokens Utilisateur
```typescript
await prisma.refreshToken.updateMany({
  where: { userId: 1, isRevoked: false },
  data: {
    isRevoked: true,
    revokedAt: new Date(),
  },
});
```

### Cleanup Tokens Expirés
```typescript
await prisma.refreshToken.deleteMany({
  where: {
    expiresAt: { lt: new Date() },
  },
});
```

---

## 📈 Impact Performance

### Requêtes Supplémentaires
- **Inscription/Login:** +1 INSERT (négligeable)
- **Refresh Token:** +1 SELECT + 1 UPDATE (acceptable)
- **Logout:** +1 UPDATE (négligeable)

### Optimisations
- ✅ Index sur `token` (recherche rapide)
- ✅ Index sur `user_id` (requêtes par utilisateur)
- ✅ Index sur `expires_at` (cleanup)
- ✅ Index composite `(is_revoked, expires_at)` (vérification)

### Cleanup Automatique
```typescript
// Cron job quotidien
@Cron('0 0 * * *') // Minuit
async cleanupExpiredTokens() {
  const deleted = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`🗑️ ${deleted.count} tokens expirés supprimés`);
}
```

---

## ✅ Checklist Migration

- [x] Modifier `database-schema-mvp.sql`
- [x] Modifier `prisma/schema.prisma`
- [x] Créer script migration `migrations/add_refresh_tokens.sql`
- [ ] Démarrer MySQL
- [ ] Appliquer migration
- [ ] Vérifier table créée
- [ ] Générer Prisma Client: `npx prisma generate`
- [ ] Tester création token
- [ ] Tester révocation token

---

## 🎯 Prochaines Étapes

1. **Démarrer MySQL**
   ```bash
   # Windows
   net start MySQL80
   
   # Ou via XAMPP/WAMP
   ```

2. **Appliquer Migration**
   ```bash
   mysql -u root -p kes_beauty_db < migrations/add_refresh_tokens.sql
   ```

3. **Générer Prisma Client**
   ```bash
   npx prisma generate
   ```

4. **Implémenter RefreshTokenService**
   - Voir `REFRESH_TOKEN_STORAGE.md` pour le code complet

5. **Tester**
   ```bash
   npm run start:dev
   # Tester inscription → Vérifier token en BD
   ```
