import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TomTomService } from '../tomtom/tomtom.service';
import { TomTomError } from '../tomtom/tomtom.types';
import { detectStops, sampleTrace, traceStats } from './trace-analysis';

/**
 * Données géographiques DÉRIVÉES d'une mission, calculées via TomTom :
 *  - itinéraire planifié (étapes -> Routing API) ;
 *  - trace nettoyée (positions GPS brutes -> Snap to Roads).
 *
 * Aucune de ces données n'est stockée ni ne remplace les positions GPS brutes (PostGIS reste la
 * source de vérité). Ces appels sont à la demande et jamais déclenchés par l'ingestion GPS : une
 * panne TomTom n'affecte donc pas la collecte.
 */
/** Sans mission en cours, la trace affichée d'un véhicule couvre ses dernières heures de roulage. */
const VEHICLE_TRACE_WINDOW_MS = 12 * 60 * 60 * 1000;
/** Limite de points envoyés à Snap to Roads (les plus récents sont conservés). */
const VEHICLE_TRACE_MAX_POINTS = 5000;
/** Échantillons renvoyés pour le survol de la trace (vitesse, heure, cap). */
const VEHICLE_TRACE_MAX_SAMPLES = 600;

@Injectable()
export class MissionGeoService {
  private readonly logger = new Logger(MissionGeoService.name);

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

  /**
   * Trace affichée pour un véhicule sur la carte temps réel : positions de sa mission en cours, ou à
   * défaut de ses 12 dernières heures, recalées sur les routes réelles (TomTom Snap to Roads). Si
   * TomTom est indisponible ou non configuré, la trace GPS brute est renvoyée (`source: 'gps'`) :
   * la carte n'est jamais privée de trace à cause du service de recalage.
   */
  async snappedVehicleTraceForOrganization(organizationId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId }, select: { id: true } });
    if (!vehicle) throw new NotFoundException('Véhicule introuvable');

    const mission = await this.prisma.mission.findFirst({
      where: { vehicleId, status: { in: [MissionStatus.STARTED, MissionStatus.IN_PROGRESS] } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    const since = new Date(Date.now() - VEHICLE_TRACE_WINDOW_MS);
    const recent = await this.prisma.gpsPosition.findMany({
      where: mission ? { vehicleId, missionId: mission.id } : { vehicleId, recordedAt: { gte: since } },
      orderBy: { recordedAt: 'desc' },
      take: VEHICLE_TRACE_MAX_POINTS,
      select: { latitude: true, longitude: true, heading: true, speed: true, recordedAt: true },
    });
    const positions = recent.reverse();
    // Arrêts (lieu + durée), vitesses et échantillons : calculés sur les positions BRUTES horodatées,
    // la trace recalée ne servant qu'au dessin de la ligne.
    const stops = detectStops(positions, new Date());
    const base = {
      derived: true,
      vehicleId,
      missionId: mission?.id ?? null,
      since: mission ? null : since.toISOString(),
      inputPoints: positions.length,
      lastPositionAt: positions.length ? positions[positions.length - 1].recordedAt.toISOString() : null,
      stops,
      stats: traceStats(positions, stops),
      samples: sampleTrace(positions, VEHICLE_TRACE_MAX_SAMPLES),
    };
    const raw = positions.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    if (positions.length < 2) return { ...base, source: 'gps' as const, points: raw, offRoadPoints: 0 };

    try {
      const last = positions[positions.length - 1].recordedAt.getTime();
      const snapped = await this.tomtom.snapToRoads(positions, `vehicle:${vehicleId}:${last}`);
      if (snapped.points.length < 2) return { ...base, source: 'gps' as const, points: raw, offRoadPoints: 0 };
      return { ...base, source: 'tomtom-snap-to-roads' as const, points: snapped.points, offRoadPoints: snapped.offRoadPoints };
    } catch (err) {
      if (!(err instanceof TomTomError)) throw err;
      this.logger.warn(`Recalage TomTom indisponible pour le véhicule ${vehicleId} (${err.kind}) : trace GPS brute renvoyée`);
      return { ...base, source: 'gps' as const, points: raw, offRoadPoints: 0 };
    }
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
