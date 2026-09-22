const { PrismaClient } = require('D:/tracking-vehicles/apps/api/node_modules/@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:postgres@127.0.0.1:5434/tracking_vehicles?schema=public' } } });

(async () => {
  try {
    const orgId = '00000000-0000-0000-0000-000000000001';
    const geo = await p.location.count({ where: { organizationId: orgId } });
    const locs = await p.location.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, take: 20 });
    console.log('GEO_POINTS:', geo);
    console.log('LOCS:', JSON.stringify(locs, null, 2));
    const zones = await p.zone.count();
    console.log('ZONES:', zones);
  } catch (e) {
    console.error('ERR', e.message);
  } finally {
    await p.$disconnect();
  }
})();