import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlertLevel, AlertType, MissionStatus, MissionStepStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LocationsService } from '../locations/locations.service';
import { FilesService } from '../files/files.service';
import { ValidateStepMetadataDto } from './dto/validate-step-metadata.dto';
import { haversineDistanceMeters } from '../common/geo.util';
import { redactSensitive } from '../common/audit-log.util';
import { AuthenticatedPrincipal } from '../common/decorators/current-user.decorator';
import {
  MISSION_STEP_ERROR_CODES,
  inactiveMissionError,
  invalidQrError,
  lowGpsAccuracyError,
  missingPhotoError,
  outOfRangeError,
  windowExpiredError,
  wrongDriverError,
  wrongStepOrderError,
} from './mission-step-validation.errors';

const DEFAULT_MAX_GPS_ACCURACY_METERS = 100;

/**
 * Validation d'étape de mission — cœur métier de la Phase 2 (spec section 10). Chaque étape doit
 * être validée par le chauffeur affecté, dans l'ordre, avec un QR code signé, une position GPS
 * dans le rayon autorisé du lieu, une précision GPS suffisante, dans la fenêtre temporelle
 * planifiée, et une photo. Voir docs/PHASE2_NOTES.md pour le contrat d'erreur complet.
 */
@Injectable()
export class MissionStepsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
    private readonly files: FilesService,
    private readonly config: ConfigService,
  ) {}

  private maxAccuracyMeters(): number {
    const configured = Number(this.config.get<string>('MAX_GPS_ACCURACY_METERS'));
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_GPS_ACCURACY_METERS;
  }

  /** Journalise une tentative de validation rejetée — jamais le binaire photo ni le qrToken en clair. */
  private async auditRejected(stepId: string, driverId: string, errorCode: keyof typeof MISSION_STEP_ERROR_CODES, detail: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId: undefined,
        action: 'mission_step.validation.rejected',
        entity: 'MissionStep',
        entityId: stepId,
        metadata: redactSensitive({ errorCode, detail, driverId }) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * POST /mission-steps/:id/validate
   *
   * Déviation documentée par rapport à l'ordre de vérification du cahier des charges : le contrôle
   * d'idempotence (clientEventId déjà traité) est effectué EN PREMIER, avant les autres règles.
   * Le respecter dans l'ordre numéroté (après le contrôle d'ordre séquentiel) casserait
   * l'idempotence elle-même : une fois la première soumission acceptée, l'étape n'est plus "la
   * prochaine étape non validée", donc une resoumission du même clientEventId après coupure réseau
   * échouerait avec WRONG_STEP_ORDER au lieu de renvoyer poliment le succès existant. Voir
   * docs/PHASE2_NOTES.md.
   */
  async validate(driverId: string, stepId: string, dto: ValidateStepMetadataDto, photo?: Express.Multer.File) {
    const existing = await this.prisma.missionStepValidation.findUnique({ where: { clientEventId: dto.clientEventId } });
    if (existing) {
      return existing;
    }

    const step = await this.prisma.missionStep.findUnique({
      where: { id: stepId },
      include: { mission: true, location: true },
    });
    if (!step) throw new NotFoundException('Étape de mission introuvable');

    // 1. Identité chauffeur == chauffeur affecté à la mission.
    if (step.mission.driverId !== driverId) {
      await this.auditRejected(stepId, driverId, 'WRONG_DRIVER', 'Chauffeur non affecté à cette mission');
      throw wrongDriverError("Cette mission n'est pas affectée à ce chauffeur");
    }

    // 2. Véhicule actuellement affecté au chauffeur == véhicule de la mission.
    const activeAssignment = await this.prisma.driverVehicleAssignment.findFirst({
      where: { driverId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });
    if (!activeAssignment || activeAssignment.vehicleId !== step.mission.vehicleId) {
      await this.auditRejected(stepId, driverId, 'WRONG_DRIVER', 'Véhicule affecté au chauffeur différent du véhicule de la mission');
      throw wrongDriverError('Le véhicule actuellement affecté à ce chauffeur ne correspond pas à celui de la mission');
    }

    // 3. Mission dans un état actif.
    if (step.mission.status !== MissionStatus.STARTED && step.mission.status !== MissionStatus.IN_PROGRESS) {
      await this.auditRejected(stepId, driverId, 'INACTIVE_MISSION', `Statut mission=${step.mission.status}`);
      throw inactiveMissionError(step.mission.status);
    }

    // 4. Ordre séquentiel : cette étape doit être la première non validée/non ignorée.
    const missionSteps = await this.prisma.missionStep.findMany({ where: { missionId: step.missionId }, orderBy: { order: 'asc' } });
    const nextPending = missionSteps.find((s) => s.status !== MissionStepStatus.VALIDATED && s.status !== MissionStepStatus.SKIPPED);
    if (!nextPending || nextPending.id !== step.id) {
      await this.auditRejected(stepId, driverId, 'WRONG_STEP_ORDER', `Attendu=${nextPending?.id ?? 'aucune'}, reçu=${step.id}`);
      throw wrongStepOrderError();
    }

    // 5. QR token : signature valide (réutilise LocationsService, même logique que generate-qr) + lieu correspondant.
    let resolvedLocationId: string;
    try {
      resolvedLocationId = await this.locations.verifyQrToken(dto.qrToken);
    } catch {
      await this.auditRejected(stepId, driverId, 'INVALID_QR', 'Signature de jeton QR invalide ou révoquée');
      throw invalidQrError('Jeton QR invalide ou révoqué');
    }
    if (resolvedLocationId !== step.locationId) {
      await this.auditRejected(stepId, driverId, 'INVALID_QR', 'Le QR scanné correspond à un autre lieu');
      throw invalidQrError("Le QR scanné ne correspond pas au lieu de cette étape");
    }

    // 6. Distance (Haversine) au lieu <= rayon autorisé du lieu.
    const distanceMeters = haversineDistanceMeters(dto.latitude, dto.longitude, step.location.latitude, step.location.longitude);
    if (distanceMeters > step.location.allowedRadius) {
      await this.auditRejected(stepId, driverId, 'OUT_OF_RANGE', `distance=${distanceMeters.toFixed(1)}m rayon=${step.location.allowedRadius}m`);
      throw outOfRangeError(distanceMeters, step.location.allowedRadius);
    }

    // 7. Précision GPS.
    const maxAccuracy = this.maxAccuracyMeters();
    if (dto.accuracy > maxAccuracy) {
      await this.auditRejected(stepId, driverId, 'LOW_GPS_ACCURACY', `accuracy=${dto.accuracy}m seuil=${maxAccuracy}m`);
      throw lowGpsAccuracyError(dto.accuracy, maxAccuracy);
    }

    // 8. Fenêtre temporelle — comparée à l'horloge SERVEUR, jamais à recordedAt (client).
    if (step.plannedAt) {
      const now = new Date();
      const toleranceMs = step.toleranceMin * 60_000;
      const windowStart = new Date(step.plannedAt.getTime() - toleranceMs);
      const windowEnd = new Date(step.plannedAt.getTime() + toleranceMs);
      if (now < windowStart || now > windowEnd) {
        await this.auditRejected(stepId, driverId, 'WINDOW_EXPIRED', `now=${now.toISOString()} fenêtre=[${windowStart.toISOString()},${windowEnd.toISOString()}]`);
        throw windowExpiredError();
      }
    }

    // 9. Photo obligatoire.
    if (!photo) {
      await this.auditRejected(stepId, driverId, 'MISSING_PHOTO', 'Aucun fichier "photo" dans la requête');
      throw missingPhotoError();
    }

    // --- Succès : persistance + upload + avancement de la mission ---
    const validation = await this.prisma.missionStepValidation.create({
      data: {
        missionStepId: step.id,
        driverId,
        clientEventId: dto.clientEventId,
        qrToken: dto.qrToken,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        isMocked: dto.isMocked,
        recordedAt: new Date(dto.recordedAt),
      },
    });

    await this.files.uploadFile({
      buffer: photo.buffer,
      mimeType: photo.mimetype,
      relatedTo: 'MissionStepValidation',
      relatedId: validation.id,
      uploadedById: driverId,
    });

    await this.prisma.missionStep.update({ where: { id: step.id }, data: { status: MissionStepStatus.VALIDATED } });

    // Avance la mission : STARTED -> IN_PROGRESS dès la première étape validée.
    if (step.mission.status === MissionStatus.STARTED) {
      await this.prisma.mission.update({ where: { id: step.missionId }, data: { status: MissionStatus.IN_PROGRESS } });
    }

    await this.prisma.missionEvent.create({
      data: {
        missionId: step.missionId,
        type: 'mission.step.validated',
        payload: { stepId: step.id, order: step.order } as Prisma.InputJsonValue,
      },
    });

    // 11. isMocked=true : accepté quand même, mais Alert basse sévérité (non bloquant).
    if (dto.isMocked) {
      await this.prisma.alert.create({
        data: {
          type: AlertType.MOCK_GPS,
          level: AlertLevel.LOW,
          message: "Position GPS potentiellement simulée (mock location) signalée par l'appareil lors de la validation d'une étape",
          driverId,
          vehicleId: step.mission.vehicleId,
          missionId: step.missionId,
        },
      });
    }

    return validation;
  }

  /** GET /mission-steps/:id/evidence — admins de l'org + chauffeur ayant validé l'étape. */
  async getEvidence(principal: AuthenticatedPrincipal, stepId: string) {
    const step = await this.prisma.missionStep.findUnique({
      where: { id: stepId },
      include: { validations: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!step) throw new NotFoundException('Étape de mission introuvable');
    const validation = step.validations[0];
    if (!validation) throw new NotFoundException('Aucune validation enregistrée pour cette étape');

    if (principal.type === 'driver' && validation.driverId !== principal.sub) {
      throw new ForbiddenException("Cette validation n'appartient pas à ce chauffeur");
    }
    if (principal.type === 'user') {
      const driver = await this.prisma.driver.findUnique({ where: { id: validation.driverId } });
      if (!driver || driver.organizationId !== principal.organizationId) {
        throw new ForbiddenException('Validation non accessible pour cette organisation');
      }
    }

    const file = await this.prisma.file.findFirst({
      where: { relatedTo: 'MissionStepValidation', relatedId: validation.id },
      orderBy: { createdAt: 'desc' },
    });
    const photo = file ? await this.files.signedGetUrl(file.id) : null;

    return { validation, photo };
  }
}
