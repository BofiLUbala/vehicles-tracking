import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'drivers.manage',
  'vehicles.manage',
  'locations.manage',
  'missions.manage',
  'users.manage',
  'roles.manage',
];

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Régie de collecte des déchets — Kinshasa (démo)',
    },
  });

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );

  const permissions = await Promise.all(
    PERMISSIONS.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const superAdminRole = roles.find((r) => r.name === RoleName.SUPER_ADMIN)!;
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permission.id },
    });
  }

  // Identifiants de démonstration uniquement — ne jamais utiliser en production.
  const demoEmail = process.env.DEMO_ADMIN_EMAIL || 'admin@demo.local';
  const demoPassword = process.env.DEMO_ADMIN_PASSWORD || 'ChangeMe123';
  const passwordHash = await argon2.hash(demoPassword);

  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      organizationId: organization.id,
      email: demoEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin (démo)',
      roleId: superAdminRole.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed terminé. Organisation: ${organization.id}. Admin démo: ${demoEmail}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
