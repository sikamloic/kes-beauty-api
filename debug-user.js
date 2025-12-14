// Script de debug pour vérifier les données utilisateur
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function debugUser() {
  try {
    // Chercher tous les users
    const users = await prisma.user.findMany({
      include: {
        providerProfile: true,
      },
    });

    console.log('\n=== UTILISATEURS EN BD ===\n');
    
    for (const user of users) {
      console.log(`ID: ${user.id}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Password Hash: ${user.passwordHash.substring(0, 20)}...`);
      console.log(`Is Active: ${user.isActive}`);
      console.log(`Provider: ${user.providerProfile ? 'Oui (ID: ' + user.providerProfile.id + ')' : 'Non'}`);
      
      // Tester le mot de passe
      const testPassword = 'sikam@210301';
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`Test password "${testPassword}": ${isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);
      
      console.log('---\n');
    }

    // Tester normalisation téléphone
    console.log('=== TEST NORMALISATION ===\n');
    const testPhones = ['683264591', '237683264591', '+237683264591'];
    
    for (const phone of testPhones) {
      const user = await prisma.user.findUnique({
        where: { phone },
      });
      console.log(`Recherche "${phone}": ${user ? '✅ TROUVÉ (ID: ' + user.id + ')' : '❌ NON TROUVÉ'}`);
    }

  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();
