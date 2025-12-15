# Guide Prisma pour Débutants

## Qu'est-ce que Prisma ?

Prisma est un **ORM (Object-Relational Mapping)** moderne pour Node.js et TypeScript. Il te permet d'interagir avec ta base de données en utilisant du code TypeScript au lieu d'écrire du SQL brut.

### Les 3 composants de Prisma

1. **Prisma Client** : Librairie auto-générée pour faire des requêtes à ta BD
2. **Prisma Migrate** : Système de migrations pour gérer l'évolution de ton schéma
3. **Prisma Studio** : Interface graphique pour visualiser/éditer tes données

---

## Le fichier `schema.prisma`

C'est le cœur de Prisma. Il définit :
- La connexion à ta base de données
- Tes modèles (tables)
- Les relations entre les modèles

```prisma
// Exemple simplifié
datasource db {
  provider = "mysql"        // Type de BD : mysql, postgresql, sqlite, etc.
  url      = env("DATABASE_URL")  // URL de connexion depuis .env
}

generator client {
  provider = "prisma-client-js"   // Génère le client TypeScript
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]   // Relation : un user a plusieurs posts
  createdAt DateTime @default(now())
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

---

## Les Commandes Prisma

### 1. `npx prisma generate`

**Rôle** : Génère le Prisma Client à partir de ton `schema.prisma`.

**Quand l'utiliser** :
- Après chaque modification du `schema.prisma`
- Après un `npm install` (le client n'est pas dans git)
- Après avoir cloné le projet

**Ce qui se passe** :
```
schema.prisma → Analyse → Génère node_modules/@prisma/client
```

**Exemple** :
```bash
npx prisma generate
```

**Important** : Cette commande ne touche PAS à ta base de données. Elle génère uniquement le code TypeScript.

---

### 2. `npx prisma db push`

**Rôle** : Synchronise ton `schema.prisma` directement avec la base de données.

**Quand l'utiliser** :
- En développement rapide / prototypage
- Quand tu n'as pas besoin d'historique de migrations
- Sur des hébergements où tu n'as pas les droits CREATE DATABASE

**Ce qui se passe** :
```
schema.prisma → Compare avec BD → Applique les changements directement
```

**Exemple** :
```bash
npx prisma db push
```

**⚠️ Attention** :
- Ne crée PAS de fichier de migration
- Peut perdre des données si tu supprimes des colonnes
- Non recommandé pour la production

**Avantage** : Ne nécessite pas de shadow database (pas besoin de droits CREATE DATABASE).

---

### 3. `npx prisma migrate dev`

**Rôle** : Crée et applique une migration en développement.

**Quand l'utiliser** :
- En développement quand tu modifies le schéma
- Quand tu veux garder un historique des changements

**Ce qui se passe** :
```
1. Crée une shadow database (copie temporaire)
2. Compare schema.prisma avec la BD actuelle
3. Génère un fichier SQL de migration
4. Applique la migration à ta BD
5. Régénère le Prisma Client
6. Supprime la shadow database
```

**Exemple** :
```bash
npx prisma migrate dev --name add_user_phone
```

Le flag `--name` donne un nom descriptif à ta migration.

**Fichiers créés** :
```
prisma/
  migrations/
    20241214_add_user_phone/
      migration.sql    ← Le SQL généré
```

**⚠️ Problème courant** : Erreur P3014 "shadow database"
- Ton utilisateur MySQL n'a pas les droits CREATE DATABASE
- Solutions : voir section "Shadow Database" plus bas

---

### 4. `npx prisma migrate deploy`

**Rôle** : Applique les migrations en production.

**Quand l'utiliser** :
- En production / staging
- Dans les pipelines CI/CD
- Quand tu déploies ton application

**Ce qui se passe** :
```
Lit les fichiers migrations/ → Applique ceux qui ne sont pas encore appliqués
```

**Exemple** :
```bash
npx prisma migrate deploy
```

**Différence avec `migrate dev`** :
| `migrate dev` | `migrate deploy` |
|---------------|------------------|
| Crée de nouvelles migrations | Applique les migrations existantes |
| Utilise shadow database | Pas de shadow database |
| Interactif (peut demander confirmation) | Non-interactif |
| Pour développement | Pour production |

---

### 5. `npx prisma migrate reset`

**Rôle** : Réinitialise complètement ta base de données.

**Quand l'utiliser** :
- Quand ta BD est dans un état incohérent
- Pour repartir de zéro en développement
- Après avoir modifié des migrations existantes

**Ce qui se passe** :
```
1. DROP DATABASE (supprime tout !)
2. CREATE DATABASE
3. Applique toutes les migrations depuis le début
4. Exécute le seed (si configuré)
```

**Exemple** :
```bash
npx prisma migrate reset
```

**⚠️ DANGER** : Supprime TOUTES les données ! Ne jamais utiliser en production.

---

### 6. `npx prisma studio`

**Rôle** : Ouvre une interface graphique web pour explorer ta BD.

**Quand l'utiliser** :
- Pour visualiser tes données
- Pour ajouter/modifier/supprimer des enregistrements manuellement
- Pour débugger

**Exemple** :
```bash
npx prisma studio
```

Ouvre automatiquement `http://localhost:5555` dans ton navigateur.

---

### 7. `npx prisma db pull`

**Rôle** : Génère le `schema.prisma` à partir d'une base de données existante.

**Quand l'utiliser** :
- Quand tu as une BD existante et tu veux commencer à utiliser Prisma
- Pour synchroniser ton schéma avec des changements faits directement en BD

**Ce qui se passe** :
```
Base de données → Analyse → Génère/Met à jour schema.prisma
```

**Exemple** :
```bash
npx prisma db pull
```

**Aussi appelé** : "Introspection"

---

### 8. `npx prisma db seed`

**Rôle** : Exécute le script de seed pour peupler ta BD avec des données initiales.

**Configuration requise** dans `package.json` :
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Exemple de fichier `prisma/seed.ts`** :
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Créer des rôles par défaut
  await prisma.role.createMany({
    data: [
      { code: 'admin', name: 'Administrateur' },
      { code: 'provider', name: 'Prestataire' },
      { code: 'client', name: 'Client' },
    ],
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Exécution** :
```bash
npx prisma db seed
```

---

### 9. `npx prisma validate`

**Rôle** : Vérifie que ton `schema.prisma` est valide.

**Quand l'utiliser** :
- Avant de commiter
- Dans les pipelines CI
- Après des modifications manuelles du schéma

**Exemple** :
```bash
npx prisma validate
```

---

### 10. `npx prisma format`

**Rôle** : Formate ton `schema.prisma` (indentation, ordre des champs).

**Exemple** :
```bash
npx prisma format
```

---

## La Shadow Database (Base de données fantôme)

### C'est quoi ?

Une base de données temporaire que Prisma crée pour :
1. Détecter les dérives entre ton schéma et la BD
2. Générer des migrations propres
3. Vérifier que les migrations sont réversibles

### Pourquoi l'erreur P3014 ?

```
Error: P3014 - Prisma Migrate could not create the shadow database
```

Ton utilisateur MySQL n'a pas le droit de créer des bases de données.

### Solutions

**Solution 1** : Donner les droits (si tu contrôles le serveur)
```sql
GRANT CREATE, DROP ON *.* TO 'ton_user'@'%';
FLUSH PRIVILEGES;
```

**Solution 2** : Utiliser une shadow database dédiée

1. Crée manuellement une base `shadow_db` sur ton serveur
2. Ajoute dans `.env` :
```
SHADOW_DATABASE_URL="mysql://user:pass@host:3306/shadow_db"
```
3. Modifie `schema.prisma` :
```prisma
datasource db {
  provider          = "mysql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

**Solution 3** : Utiliser `db push` au lieu de `migrate dev`
```bash
npx prisma db push
```

---

## Workflow recommandé

### En développement

```bash
# 1. Modifier schema.prisma

# 2. Appliquer les changements
npx prisma migrate dev --name description_du_changement

# 3. Le client est auto-régénéré, tu peux coder !
```

### En production (déploiement)

```bash
# 1. Build
npm run build

# 2. Générer le client Prisma
npx prisma generate

# 3. Appliquer les migrations
npx prisma migrate deploy

# 4. Démarrer l'app
npm run start:prod
```

### Si tu n'as pas les droits CREATE DATABASE

```bash
# Utiliser db push au lieu de migrate
npx prisma db push

# Puis générer le client
npx prisma generate
```

---

## Résumé des commandes

| Commande | Rôle | Modifie la BD ? | Modifie schema.prisma ? |
|----------|------|-----------------|-------------------------|
| `generate` | Génère le client TypeScript | ❌ | ❌ |
| `db push` | Sync schéma → BD (sans migration) | ✅ | ❌ |
| `migrate dev` | Crée + applique migration | ✅ | ❌ |
| `migrate deploy` | Applique migrations existantes | ✅ | ❌ |
| `migrate reset` | Reset complet de la BD | ✅ (DANGER) | ❌ |
| `studio` | Interface graphique | ❌ | ❌ |
| `db pull` | BD → schéma (introspection) | ❌ | ✅ |
| `db seed` | Peuple la BD avec données initiales | ✅ | ❌ |
| `validate` | Vérifie le schéma | ❌ | ❌ |
| `format` | Formate le schéma | ❌ | ✅ |

---

## Bonnes pratiques

1. **Toujours commiter les migrations** : Les fichiers `migrations/` doivent être versionnés
2. **Ne jamais modifier une migration déjà appliquée** : Crée une nouvelle migration à la place
3. **Utiliser des noms descriptifs** : `--name add_user_email` pas `--name update`
4. **Tester les migrations** : Utilise `migrate reset` en dev pour vérifier que tout s'applique bien
5. **Seed pour les données de référence** : Rôles, catégories, etc.

---

## Ressources

- [Documentation officielle Prisma](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Shadow Database](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database)
