# 🔧 Prisma Commands Guide

Guide complet des commandes Prisma pour le projet Beauty Platform.

---

## 📑 Table des Matières

1. [Commandes Essentielles](#commandes-essentielles)
2. [Workflow de Développement](#workflow-de-développement)
3. [Commandes Avancées](#commandes-avancées)
4. [Troubleshooting](#troubleshooting)

---

## 🎯 Commandes Essentielles

### 1. `npx prisma generate`

**Fonction:** Génère le Prisma Client TypeScript

**Quand l'utiliser:**
- ✅ Après modification de `schema.prisma`
- ✅ Après ajout/modification de models
- ✅ Après `npm install` (première installation)
- ✅ Avant `npm run build` si schéma modifié

**Ce qu'elle fait:**
1. Lit `prisma/schema.prisma`
2. Génère le code TypeScript dans `node_modules/.prisma/client/`
3. Crée les types TypeScript pour tous les models
4. Génère les méthodes CRUD typées

**Exemple:**
```bash
# Après avoir ajouté un nouveau model
npx prisma generate

# Output:
# ✔ Generated Prisma Client (5.8.0) to ./node_modules/@prisma/client
```

**Résultat:**
```typescript
// ✅ Maintenant disponible avec autocomplétion
this.prisma.providerSpecialty.findMany()
this.prisma.service.create({ data: {...} })
```

---

### 2. `npx prisma db push`

**Fonction:** Synchronise la base de données avec `schema.prisma`

**Source:** `prisma/schema.prisma` **uniquement**

**Quand l'utiliser:**
- ✅ Développement rapide
- ✅ Prototypage
- ✅ Synchroniser DB après modification schéma
- ❌ **PAS en production** (utiliser migrations)

**Ce qu'elle fait:**
1. Lit `prisma/schema.prisma`
2. Compare avec l'état actuel de la DB
3. Génère et exécute le SQL nécessaire
4. **Ne crée PAS de fichiers de migration**

**Exemple:**
```bash
# Après avoir modifié schema.prisma
npx prisma db push

# Output:
# The database is now in sync with the Prisma schema.
# ✔ Generated Prisma Client (5.8.0)
```

**Comportement:**
- ✅ Crée les tables manquantes
- ✅ Ajoute les colonnes manquantes
- ✅ Modifie les types de colonnes
- ⚠️ **Ignore** les tables DB non définies dans `schema.prisma`
- ❌ **Ne supprime PAS** les tables automatiquement

**Exemple concret:**

**schema.prisma:**
```prisma
model User {
  id    Int    @id @default(autoincrement())
  phone String @unique
  email String?
}
```

**Commande:**
```bash
npx prisma db push
```

**SQL généré et exécuté:**
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(191) UNIQUE NOT NULL,
  email VARCHAR(191)
);
```

---

### 3. `npx prisma db pull`

**Fonction:** Génère `schema.prisma` depuis la base de données existante

**Direction:** DB → `schema.prisma` (inverse de `db push`)

**Quand l'utiliser:**
- ✅ Importer une DB existante
- ✅ Récupérer des changements manuels SQL
- ✅ Synchroniser après migration SQL manuelle
- ✅ Reverse engineering d'une DB

**Ce qu'elle fait:**
1. Lit toutes les tables de la DB
2. Génère les models Prisma correspondants
3. **Écrase** `prisma/schema.prisma`

**Exemple:**
```bash
# DB a été modifiée manuellement
npx prisma db pull

# Output:
# Introspecting based on datasource defined in prisma/schema.prisma
# ✔ Introspected 15 models and wrote them into prisma/schema.prisma
```

**Avant (DB a: users, roles, new_table):**
```prisma
// schema.prisma
model User { ... }
model Role { ... }
```

**Après `npx prisma db pull`:**
```prisma
// schema.prisma
model User { ... }
model Role { ... }
model NewTable { ... }  // ← Ajouté automatiquement
```

**⚠️ Attention:**
- Écrase le fichier `schema.prisma`
- Peut perdre les commentaires personnalisés
- Peut perdre certaines configurations Prisma

---

### 4. `npx prisma studio`

**Fonction:** Interface graphique pour explorer et modifier les données

**Quand l'utiliser:**
- ✅ Visualiser les données
- ✅ Modifier des enregistrements rapidement
- ✅ Déboguer les relations
- ✅ Tester les données

**Ce qu'elle fait:**
1. Lance un serveur web local
2. Ouvre l'interface dans le navigateur
3. Permet CRUD sur toutes les tables

**Exemple:**
```bash
npx prisma studio

# Output:
# Environment variables loaded from .env
# Prisma Studio is up on http://localhost:5555
```

**Interface:**
- 📊 Vue tabulaire de toutes les tables
- ✏️ Édition en ligne
- 🔍 Filtres et recherche
- 🔗 Navigation dans les relations

---

### 5. `npx prisma migrate dev`

**Fonction:** Crée et applique des migrations (développement)

**Quand l'utiliser:**
- ✅ **Production-ready** migrations
- ✅ Historique des changements DB
- ✅ Travail en équipe
- ✅ Déploiement contrôlé

**Ce qu'elle fait:**
1. Détecte les changements dans `schema.prisma`
2. Crée un fichier de migration SQL
3. Applique la migration à la DB
4. Génère le Prisma Client

**Exemple:**
```bash
# Après modification schema.prisma
npx prisma migrate dev --name add_provider_specialties

# Output:
# Applying migration `20241203_add_provider_specialties`
# ✔ Generated Prisma Client (5.8.0)
```

**Crée:**
```
prisma/migrations/
  └── 20241203120000_add_provider_specialties/
      └── migration.sql
```

**Différence avec `db push`:**

| `db push` | `migrate dev` |
|-----------|---------------|
| ❌ Pas de fichier migration | ✅ Crée fichier migration |
| ✅ Rapide pour prototypage | ✅ Historique complet |
| ❌ Pas de rollback | ✅ Rollback possible |
| ❌ Pas pour production | ✅ Production-ready |

---

### 6. `npx prisma migrate deploy`

**Fonction:** Applique les migrations en production

**Quand l'utiliser:**
- ✅ **Déploiement production**
- ✅ CI/CD pipelines
- ✅ Serveurs de staging

**Ce qu'elle fait:**
1. Applique les migrations non appliquées
2. **Ne génère PAS** de nouvelles migrations
3. **Ne génère PAS** le Prisma Client

**Exemple:**
```bash
# En production
npx prisma migrate deploy

# Output:
# 2 migrations found in prisma/migrations
# Applying migration `20241203_add_provider_specialties`
# ✔ Applied 1 migration in 234ms
```

**⚠️ Important:**
- Utiliser en production **uniquement**
- Toujours tester en staging d'abord
- Faire un backup DB avant

---

## 🔄 Workflow de Développement

### Workflow 1: Développement Rapide (Prototypage)

**Utiliser:** `db push` + `generate`

```bash
# 1. Modifier schema.prisma
# Ajouter/modifier models

# 2. Synchroniser DB
npx prisma db push

# 3. Générer client TypeScript
npx prisma generate

# 4. Compiler et tester
npm run build
npm run start:dev
```

**Avantages:**
- ✅ Rapide
- ✅ Pas de fichiers migration
- ✅ Idéal pour prototypage

**Inconvénients:**
- ❌ Pas d'historique
- ❌ Pas de rollback
- ❌ Pas pour production

---

### Workflow 2: Développement Production-Ready

**Utiliser:** `migrate dev` + `generate`

```bash
# 1. Modifier schema.prisma
# Ajouter/modifier models

# 2. Créer et appliquer migration
npx prisma migrate dev --name add_new_feature

# 3. Client déjà généré par migrate dev
# Pas besoin de npx prisma generate

# 4. Compiler et tester
npm run build
npm run start:dev

# 5. Commit migration files
git add prisma/migrations/
git commit -m "feat: add new feature migration"
```

**Avantages:**
- ✅ Historique complet
- ✅ Rollback possible
- ✅ Production-ready
- ✅ Travail en équipe

---

### Workflow 3: Import DB Existante

**Utiliser:** `db pull` + nettoyage + `generate`

```bash
# 1. DB existe déjà (créée manuellement ou par SQL)
mysql -u root kes_beauty_db < database-schema-mvp.sql

# 2. Générer schema.prisma depuis DB
npx prisma db pull

# 3. Nettoyer schema.prisma
# Retirer tables non voulues
# Ajouter commentaires
# Ajuster types

# 4. Générer client
npx prisma generate

# 5. Compiler
npm run build
```

---

### Workflow 4: Migration SQL Manuelle

**Utiliser:** SQL manuel + `db pull` + `generate`

```bash
# 1. Créer migration SQL manuelle
# migrations/add_provider_specialties.sql

# 2. Exécuter migration SQL
mysql -u root kes_beauty_db < migrations/add_provider_specialties.sql

# 3. Synchroniser schema.prisma
npx prisma db pull

# 4. Vérifier schema.prisma
# S'assurer que les changements sont corrects

# 5. Générer client
npx prisma generate

# 6. Compiler
npm run build
```

---

## 🔧 Commandes Avancées

### `npx prisma format`

**Fonction:** Formate `schema.prisma`

```bash
npx prisma format

# Formate:
# - Indentation
# - Alignement
# - Ordre des champs
```

---

### `npx prisma validate`

**Fonction:** Valide `schema.prisma` sans toucher à la DB

```bash
npx prisma validate

# Output si OK:
# ✔ The schema at prisma/schema.prisma is valid

# Output si erreur:
# Error: Field "userId" is missing in model "User"
```

---

### `npx prisma migrate reset`

**Fonction:** **SUPPRIME** toutes les données et réapplique toutes les migrations

**⚠️ DANGER:** Perte de toutes les données!

```bash
npx prisma migrate reset

# Demande confirmation:
# ? Are you sure you want to reset your database? › (y/N)

# Fait:
# 1. DROP toutes les tables
# 2. Réapplique toutes les migrations
# 3. Exécute seed (si configuré)
```

**Utiliser uniquement:**
- ✅ Développement local
- ✅ Reset complet nécessaire
- ❌ **JAMAIS en production**

---

### `npx prisma migrate status`

**Fonction:** Affiche l'état des migrations

```bash
npx prisma migrate status

# Output:
# Database schema is up to date!
# 
# 3 migrations found in prisma/migrations
# 
# ✔ 20241201_init
# ✔ 20241202_add_services
# ✔ 20241203_add_specialties
```

---

### `npx prisma db seed`

**Fonction:** Exécute le script de seed

**Configuration dans `package.json`:**
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

**Exécution:**
```bash
npx prisma db seed

# Exécute prisma/seed.ts
# Insère données de test
```

---

## 🐛 Troubleshooting

### Erreur: "Property 'X' does not exist on type 'PrismaClient'"

**Cause:** Prisma Client pas généré ou obsolète

**Solution:**
```bash
npx prisma generate
```

---

### Erreur: "Can't reach database server"

**Cause:** MySQL pas démarré ou mauvaise config

**Solution:**
```bash
# 1. Vérifier MySQL
# Windows:
net start MySQL80

# 2. Vérifier .env
DATABASE_URL="mysql://root:password@localhost:3306/kes_beauty_db"

# 3. Tester connexion
npx prisma db pull
```

---

### Erreur: "Migration failed to apply"

**Cause:** Conflit avec état actuel de la DB

**Solution:**
```bash
# Option 1: Reset complet (développement)
npx prisma migrate reset

# Option 2: Résoudre manuellement
# 1. Vérifier l'erreur SQL
# 2. Corriger la DB manuellement
# 3. Marquer migration comme appliquée
npx prisma migrate resolve --applied "20241203_migration_name"
```

---

### Schema.prisma et DB désynchronisés

**Symptôme:** `schema.prisma` différent de la DB

**Solution:**
```bash
# Option 1: DB = source de vérité
npx prisma db pull
npx prisma generate

# Option 2: schema.prisma = source de vérité
npx prisma db push
npx prisma generate
```

---

### Prisma Client cache issues

**Symptôme:** Changements pas pris en compte

**Solution:**
```bash
# 1. Nettoyer cache
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# 2. Régénérer
npx prisma generate

# 3. Rebuild
npm run build
```

---

## 📊 Comparaison des Commandes

| Commande | Direction | Crée Migrations | Modifie DB | Génère Client | Usage |
|----------|-----------|-----------------|------------|---------------|-------|
| `generate` | - | ❌ | ❌ | ✅ | Toujours après changement schéma |
| `db push` | schema → DB | ❌ | ✅ | ✅ | Prototypage rapide |
| `db pull` | DB → schema | ❌ | ❌ | ❌ | Import DB existante |
| `migrate dev` | schema → DB | ✅ | ✅ | ✅ | Développement production-ready |
| `migrate deploy` | migrations → DB | ❌ | ✅ | ❌ | Déploiement production |
| `studio` | - | ❌ | ✅ | ❌ | Visualisation/édition données |

---

## ✅ Commandes Recommandées par Situation

### Développement Initial (Prototypage)
```bash
npx prisma db push
npx prisma generate
```

### Développement Avancé (Production-Ready)
```bash
npx prisma migrate dev --name feature_name
# generate inclus automatiquement
```

### Import DB Existante
```bash
npx prisma db pull
npx prisma generate
```

### Déploiement Production
```bash
npx prisma migrate deploy
npx prisma generate
```

### Visualiser Données
```bash
npx prisma studio
```

### Reset Complet (Dev Only)
```bash
npx prisma migrate reset
```

---

## 🎯 Workflow Actuel du Projet

**Pour ce projet Beauty Platform:**

```bash
# 1. Modifier schema.prisma
# Ajouter/modifier models

# 2. Synchroniser DB (développement)
npx prisma db push

# 3. Générer client TypeScript
npx prisma generate

# 4. Compiler
npm run build

# 5. Tester
npm run start:dev
```

**Fichiers SQL manuels** (`database-schema-mvp.sql`, `migrations/*.sql`):
- Pour documentation
- Pour référence
- Pour exécution manuelle si besoin

**Prisma** (`schema.prisma`):
- Source de vérité pour le code
- Utilisé par toutes les commandes Prisma

---

**Dernière mise à jour:** 2024-12-03
