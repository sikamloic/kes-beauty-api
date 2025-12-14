import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Créer rôles
  console.log('Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'client' },
      update: {},
      create: {
        code: 'client',
        name: 'Client',
        description: 'Utilisateur final de la plateforme',
      },
    }),
    prisma.role.upsert({
      where: { code: 'provider' },
      update: {},
      create: {
        code: 'provider',
        name: 'Prestataire',
        description: 'Fournisseur de services beauté',
      },
    }),
    prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: {
        code: 'admin',
        name: 'Administrateur',
        description: 'Administrateur de la plateforme',
      },
    }),
  ]);

  console.log(`✅ ${roles.length} roles created`);

  // 2. Créer admin par défaut (password: Admin@123)
  console.log('Creating admin user...');
  const adminUser = await prisma.user.upsert({
    where: { phone: '+237600000000' },
    update: {},
    create: {
      phone: '+237600000000',
      email: 'admin@beautyplatform.cm',
      passwordHash:
        '$2b$10$rGHvQZ8YxZ8YxZ8YxZ8YxOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq',
      phoneVerifiedAt: new Date(),
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roles[2].id, // admin role
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles[2].id,
    },
  });

  console.log(`✅ Admin user created: ${adminUser.phone}`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
