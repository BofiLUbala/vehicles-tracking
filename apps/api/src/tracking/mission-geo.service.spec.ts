import { NotFoundException } from '@nestjs/common';
import { MissionGeoService } from './mission-geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { TomTomService } from '../tomtom/tomtom.service';
import { TomTomError } from '../tomtom/tomtom.types';

describe('MissionGeoService — trace véhicule recalée sur les routes', () => {
  const positions = [
    { latitude: -4.3050, longitude: 15.3100, heading: 250, speed: 40, recordedAt: new Date('2026-09-29T10:00:04Z') },
    { latitude: -4.3040, longitude: 15.3120, heading: 250, speed: 40, recordedAt: new Date('2026-09-29T10:00:02Z') },
    { latitude: -4.3036, longitude: 15.3142, heading: 250, speed: 40, recordedAt: new Date('2026-09-29T10:00:00Z') },
  ];
  const prisma = {
    vehicle: { findFirst: jest.fn() },
    mission: { findFirst: jest.fn() },
    gpsPosition: { findMany: jest.fn() },
  };
  const tomtom = { snapToRoads: jest.fn() };
  const service = new MissionGeoService(prisma as unknown as PrismaService, tomtom as unknown as TomTomService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vehicle.findFirst.mockResolvedValue({ id: 'v1' });
    prisma.mission.findFirst.mockResolvedValue(null);
    prisma.gpsPosition.findMany.mockResolvedValue([...positions]);
  });

  it('renvoie la trace recalée par TomTom, en ordre chronologique', async () => {
    const snappedPoints = [{ latitude: -4.30361, longitude: 15.31421 }, { latitude: -4.30502, longitude: 15.31001 }];
    tomtom.snapToRoads.mockResolvedValue({ points: snappedPoints, inputPoints: 3, offRoadPoints: 0 });

    const trace = await service.snappedVehicleTraceForOrganization('org-1', 'v1');

    expect(trace.source).toBe('tomtom-snap-to-roads');
    expect(trace.points).toEqual(snappedPoints);
    // Vitesses et échantillons (survol) calculés sur les positions brutes.
    expect(trace.stats.maxSpeedKmh).toBe(40);
    expect(trace.samples).toHaveLength(3);
    expect(trace.stops).toEqual([]);
    const sent = tomtom.snapToRoads.mock.calls[0][0];
    expect(sent.map((p: { recordedAt: Date }) => p.recordedAt.toISOString())).toEqual([
      '2026-09-29T10:00:00.000Z',
      '2026-09-29T10:00:02.000Z',
      '2026-09-29T10:00:04.000Z',
    ]);
    // Sans mission en cours : fenêtre des 12 dernières heures.
    expect(prisma.gpsPosition.findMany.mock.calls[0][0].where).toEqual({ vehicleId: 'v1', recordedAt: { gte: expect.any(Date) } });
  });

  it('se limite à la mission en cours quand il y en a une', async () => {
    prisma.mission.findFirst.mockResolvedValue({ id: 'm1' });
    tomtom.snapToRoads.mockResolvedValue({ points: [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }], inputPoints: 3, offRoadPoints: 0 });

    const trace = await service.snappedVehicleTraceForOrganization('org-1', 'v1');

    expect(trace.missionId).toBe('m1');
    expect(prisma.gpsPosition.findMany.mock.calls[0][0].where).toEqual({ vehicleId: 'v1', missionId: 'm1' });
  });

  it('renvoie la trace GPS brute si TomTom est indisponible (jamais de carte sans trace)', async () => {
    tomtom.snapToRoads.mockRejectedValue(new TomTomError('NOT_CONFIGURED', 'clé absente'));

    const trace = await service.snappedVehicleTraceForOrganization('org-1', 'v1');

    expect(trace.source).toBe('gps');
    expect(trace.points).toHaveLength(3);
    expect(trace.points[0]).toEqual({ latitude: -4.3036, longitude: 15.3142 });
  });

  it("refuse un véhicule d'une autre organisation", async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);
    await expect(service.snappedVehicleTraceForOrganization('org-1', 'v-autre')).rejects.toThrow(NotFoundException);
    expect(tomtom.snapToRoads).not.toHaveBeenCalled();
  });
});
