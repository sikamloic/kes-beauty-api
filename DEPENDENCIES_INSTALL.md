# 📦 Installation des Dépendances - Beauty Platform API

## Commandes d'installation

### 🔴 CRITIQUE P0 - Infrastructure de Base

```bash
# Configuration & Environment
npm install @nestjs/config class-validator class-transformer

# Base de données (Prisma - Recommandé)
npm install @prisma/client
npm install -D prisma

# OU Base de données (TypeORM - Alternative)
# npm install @nestjs/typeorm typeorm mysql2

# Authentification & Sécurité
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/bcrypt @types/passport-jwt

# Validation & Transformation
# (déjà installé ci-dessus avec class-validator et class-transformer)
```

### 🟡 IMPORTANT P0.5 - Fonctionnalités Core

```bash
# HTTP Client (pour SMS, Paiements)
npm install @nestjs/axios axios

# WebSocket (Chat temps réel)
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Rate Limiting & Sécurité
npm install @nestjs/throttler helmet compression
npm install -D @types/compression
```

### 🟢 UTILE - Amélioration Qualité

```bash
# Logging
npm install winston nest-winston

# Testing amélioré
npm install -D @faker-js/faker

# Documentation API
npm install @nestjs/swagger
```

## Installation Complète (Recommandée)

```bash
# Une seule commande pour tout installer
npm install @nestjs/config class-validator class-transformer @prisma/client @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt @nestjs/axios axios @nestjs/websockets @nestjs/platform-socket.io socket.io @nestjs/throttler helmet compression winston nest-winston @nestjs/swagger && npm install -D prisma @types/bcrypt @types/passport-jwt @types/compression @faker-js/faker
```

## Choix Techniques

### Base de Données: Prisma vs TypeORM

**Prisma (Recommandé) ✅**
- Type safety excellente
- Migrations déclaratives
- Performance supérieure
- DX moderne

**TypeORM (Alternative)**
- Intégration NestJS native
- Plus mature
- Communauté plus large

**Décision:** Prisma pour ce projet (meilleure DX, moins de bugs)

### MySQL vs PostgreSQL

**MySQL (Choisi) ✅**
- Plus répandu en Afrique
- Coût hébergement inférieur
- Performance lectures excellente
- Suffisant pour géolocalisation basique

**PostgreSQL (Alternative)**
- PostGIS pour géolocalisation avancée
- JSON support supérieur
- Meilleur pour écritures intensives

**Décision:** MySQL pour MVP (coût, familiarité), migration PostgreSQL possible plus tard

## Vérification Installation

```bash
# Vérifier que tout est installé
npm list @nestjs/config @prisma/client @nestjs/jwt

# Initialiser Prisma
npx prisma init

# Vérifier TypeScript
npm run build
```

## Prochaines Étapes

1. ✅ Dépendances installées
2. ⏳ Configurer Prisma
3. ⏳ Créer schéma DB
4. ⏳ Setup variables d'environnement
5. ⏳ Créer premier module (Auth)
