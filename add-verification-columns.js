#!/usr/bin/env node
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

console.log('🔧 Ajout colonnes de vérification...\n');

const url = new URL(process.env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
});

const prisma = new PrismaClient({ adapter });

async function addColumns() {
  try {
    await prisma.$connect();
    console.log('✅ Connecté\n');

    // 1. Rendre address NULL
    console.log('1️⃣ Modification address → NULL');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE provider_profiles 
      MODIFY COLUMN address TEXT NULL
    `);
    console.log('   ✅ Done\n');

    // 2. Ajouter phone_verified
    console.log('2️⃣ Ajout phone_verified');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE provider_verifications 
      ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('   ✅ Done\n');

    // 3. Ajouter identity_verified
    console.log('3️⃣ Ajout identity_verified');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE provider_verifications 
      ADD COLUMN identity_verified BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('   ✅ Done\n');

    // 4. Ajouter portfolio_verified
    console.log('4️⃣ Ajout portfolio_verified');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE provider_verifications 
      ADD COLUMN portfolio_verified BOOLEAN NOT NULL DEFAULT FALSE
    `);
    console.log('   ✅ Done\n');

    console.log('✅ Toutes les colonnes ajoutées avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.message.includes('Duplicate column')) {
      console.log('ℹ️  La colonne existe déjà');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addColumns();
