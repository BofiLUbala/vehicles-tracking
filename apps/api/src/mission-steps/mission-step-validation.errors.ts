import { HttpStatus } from '@nestjs/common';
import { CodedHttpException } from '../common/exceptions/coded-http.exception';

/**
 * Contrat d'erreurs de `POST /mission-steps/:id/validate` — ces 8 codes sont EXACTEMENT ceux
 * requis par le cahier des charges (section 10) et partagés tels quels avec l'application
 * chauffeur ; ne pas les renommer. Voir docs/PHASE2_NOTES.md pour le tableau complet
 * (code, statut HTTP, signification, ordre de vérification). Le corps de réponse final est
 * `{ statusCode, errorCode, message, timestamp }` (voir AllExceptionsFilter, qui propage
 * `errorCode` s'il est présent sur le corps de l'exception).
 */
export const MISSION_STEP_ERROR_CODES = {
  WRONG_DRIVER: 'WRONG_DRIVER',
  INACTIVE_MISSION: 'INACTIVE_MISSION',
  WRONG_STEP_ORDER: 'WRONG_STEP_ORDER',
  INVALID_QR: 'INVALID_QR',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  LOW_GPS_ACCURACY: 'LOW_GPS_ACCURACY',
  WINDOW_EXPIRED: 'WINDOW_EXPIRED',
  MISSING_PHOTO: 'MISSING_PHOTO',
} as const;

export type MissionStepErrorCode = keyof typeof MISSION_STEP_ERROR_CODES;

/** 403 — l'étape n'appartient pas à une mission affectée à ce chauffeur, ou le véhicule ne correspond pas. */
export const wrongDriverError = (message: string) =>
  new CodedHttpException(MISSION_STEP_ERROR_CODES.WRONG_DRIVER, message, HttpStatus.FORBIDDEN);

export const inactiveMissionError = (status: string) =>
  new CodedHttpException(
    MISSION_STEP_ERROR_CODES.INACTIVE_MISSION,
    `La mission doit être active (STARTED/IN_PROGRESS) pour valider une étape — statut actuel : ${status}`,
    HttpStatus.BAD_REQUEST,
  );

export const wrongStepOrderError = () =>
  new CodedHttpException(
    MISSION_STEP_ERROR_CODES.WRONG_STEP_ORDER,
    "Cette étape n'est pas la prochaine étape non validée de la mission",
    HttpStatus.BAD_REQUEST,
  );

export const invalidQrError = (message = 'Jeton QR invalide, révoqué, ou ne correspondant pas au lieu de cette étape') =>
  new CodedHttpException(MISSION_STEP_ERROR_CODES.INVALID_QR, message, HttpStatus.BAD_REQUEST);

export const outOfRangeError = (distanceMeters: number, allowedRadius: number) =>
  new CodedHttpException(
    MISSION_STEP_ERROR_CODES.OUT_OF_RANGE,
    `Position hors de la zone autorisée (${Math.round(distanceMeters)}m, rayon autorisé ${allowedRadius}m)`,
    HttpStatus.BAD_REQUEST,
  );

export const lowGpsAccuracyError = (accuracy: number, threshold: number) =>
  new CodedHttpException(
    MISSION_STEP_ERROR_CODES.LOW_GPS_ACCURACY,
    `Précision GPS insuffisante (${accuracy}m, seuil maximal ${threshold}m)`,
    HttpStatus.BAD_REQUEST,
  );

export const windowExpiredError = () =>
  new CodedHttpException(
    MISSION_STEP_ERROR_CODES.WINDOW_EXPIRED,
    'Hors de la fenêtre de tolérance temporelle prévue pour cette étape',
    HttpStatus.BAD_REQUEST,
  );

export const missingPhotoError = () =>
  new CodedHttpException(MISSION_STEP_ERROR_CODES.MISSING_PHOTO, 'Une photo est requise pour valider cette étape', HttpStatus.BAD_REQUEST);
