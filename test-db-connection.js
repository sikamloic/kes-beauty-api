#!/usr/bin/env node
/**
 * Script de test de connexion à la base de données
 * Usage: node test-db-connection.js
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

console.log('🔍 Test de connexion à la base de données MySQL\n');

// Parse DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL non définie dans .env');
  process.exit(1);
}

console.log('📋 Configuration:');
const url = new URL(databaseUrl);
console.log(`   Host: ${url.hostname}`);
console.log(`   Port: ${url.port || 3306}`);
console.log(`   User: ${url.username}`);
console.log(`   Database: ${url.pathname.slice(1)}`);
console.log('');

// Créer adapter
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  connectionLimit: 5,
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function testConnection() {
  const startTime = Date.now();

  try {
    console.log('⏳ Connexion en cours...');
    await prisma.$connect();
    console.log('✅ Connexion établie\n');

    // Test 1: Query simple
    console.log('📊 Test 1: Query simple (SELECT 1)');
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log(`   ✅ Résultat:`, result);
    console.log('');

    // Test 2: Liste des tables
    console.log('📊 Test 2: Liste des tables');
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `;
    console.log(`   ✅ ${tables.length} tables trouvées:`);
    tables.forEach((t) => console.log(`      - ${t.TABLE_NAME}`));
    console.log('');

    // Test 3: Compter les utilisateurs
    console.log('📊 Test 3: Compter les utilisateurs');
    const userCount = await prisma.user.count();
    console.log(`   ✅ ${userCount} utilisateur(s) dans la table users`);
    console.log('');

    // Test 4: Compter les rôles
    console.log('📊 Test 4: Compter les rôles');
    const roleCount = await prisma.role.count();
    console.log(`   ✅ ${roleCount} rôle(s) dans la table roles`);
    console.log('');

    const latency = Date.now() - startTime;
    console.log(`⚡ Temps total: ${latency}ms`);
    console.log('\n✅ Tous les tests sont passés avec succès!');

    return true;
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('\n❌ Erreur de connexion:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Temps écoulé: ${latency}ms`);
    
    if (error.code) {
      console.error(`   Code erreur: ${error.code}`);
    }

    return false;
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Connexion fermée');
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
