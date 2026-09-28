import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TomTomService } from '../tomtom/tomtom.service';
import { TomTomError } from '../tomtom/tomtom.types';

/**
 * Données géographiques DÉRIVÉES d'une mission, calculées via TomTom :
 *  - itinéraire planifié (étapes -> Routing API) ;
 *  - trace nettoyée (positions GPS brutes -> Snap to Roads).
 *
 * Aucune de ces données n'est stockée ni ne remplace les positions GPS brutes (PostGIS reste la
 * source de vérité). Ces appels sont à la demande et jamais déclenchés par l'ingestion GPS : une
 * panne TomTom n'affecte donc pas la collecte.
 */
@Injectable()
export class MissionGeoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tomtom: TomTomService,
  ) {}

  async plannedRouteForOrganization(organizationId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id: missionId, organizationId }, select: { id: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return this.plannedRoute(missionId);
  }

  async plannedRouteForDriver(driverId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id: missionId, driverId }, select: { id: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return this.plannedRoute(missionId);
  }

  async snappedTraceForOrganization(organizationId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id: missionId, organizationId }, select: { id: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return this.snappedTrace(missionId);
  }

  /** Même trace recalée, limitée aux missions du chauffeur appelant (écran « Revoir le trajet »). */
  async snappedTraceForDriver(driverId: string, missionId: string) {
    const mission = await this.prisma.mission.findFirst({ where: { id: missionId, driverId }, select: { id: true } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return this.snappedTrace(missionId);
  }

  /** Adresse d'un point (arrêt détecté). À la demande, mise en cache côté TomTomService. */
  async reverseGeocode(latitude: number, longitude: number) {
    const result = await this.guard(() => this.tomtom.reverseGeocode({ latitude, longitude }));
    return { derived: true, source: 'tomtom-reverse-geocode', latitude, longitude, ...result };
  }

  private async snappedTrace(missionId: string) {
    const positions = await this.prisma.gpsPosition.findMany({
      where: { missionId },
      orderBy: { recordedAt: 'asc' },
      select: { latitude: true, longitude: true, heading: true, recordedAt: true },
    });
    if (positions.length < 2) return { derived: true, source: 'tomtom-snap-to-roads', points: [], inputPoints: positions.length, offRoadPoints: 0 };
    const last = positions[positions.length - 1].recordedAt.getTime();
    // COÛT : un seul appel batch par (mission, nombre de points) ; le résultat est mis en cache.
    const snapped = await this.guard(() => this.tomtom.snapToRoads(positions, `${missionId}:${last}`));
    return { derived: true, source: 'tomtom-snap-to-roads', ...snapped };
  }

  private async plannedRoute(missionId: string) {
    const steps = await this.prisma.missionStep.findMany({
      where: { missionId },
      orderBy: { order: 'asc' },
      select: { order: true, location: { select: { latitude: true, longitude: true } } },
    });
    const waypoints = steps.map((s) => ({ latitude: s.location.latitude, longitude: s.location.longitude }));
    // COÛT : appel à la demande uniquement (mise en cache par géométrie d'étapes), jamais par point GPS.
    const route = await this.guard(() => this.tomtom.calculateRoute(waypoints));
    return { derived: true, source: 'tomtom-routing', missionId, ...route };
  }

  /** Traduit les erreurs TomTom en réponses HTTP propres, sans jamais exposer de détail sensible. */
  private async guard<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof TomTomError)) throw err;
      const map: Record<TomTomError['kind'], HttpStatus> = {
        NOT_CONFIGURED: HttpStatus.SERVICE_UNAVAILABLE,
        INVALID_INPUT: HttpStatus.UNPROCESSABLE_ENTITY,
        AUTH: HttpStatus.BAD_GATEWAY,
        RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
        UPSTREAM: HttpStatus.BAD_GATEWAY,
        TIMEOUT: HttpStatus.GATEWAY_TIMEOUT,
        MALFORMED: HttpStatus.BAD_GATEWAY,
      };
      throw new HttpException({ statusCode: map[err.kind], code: `TOMTOM_${err.kind}`, message: err.message }, map[err.kind]);
    }
  }
}
