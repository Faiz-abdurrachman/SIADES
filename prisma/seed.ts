import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed roles
  const roles = ['admin', 'operator', 'kepala_desa'];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log('Roles seeded: admin, operator, kepala_desa');

  // 2. Seed admin user
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    throw new Error('Admin role not found after seeding');
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@siades.test' },
    update: {},
    create: {
      name: 'Admin SIADes',
      email: 'admin@siades.test',
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  console.log('Admin user seeded: admin@siades.test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
