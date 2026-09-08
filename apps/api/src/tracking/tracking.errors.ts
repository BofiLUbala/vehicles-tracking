import { HttpStatus } from '@nestjs/common';
import { CodedHttpException } from '../common/exceptions/coded-http.exception';

/**
 * Contrat d'erreurs de `POST /tracking/positions[/batch]` (spec section 11). Un seul code pour
 * l'instant — même convention que `mission-steps/mission-step-validation.errors.ts`.
 */
export const TRACKING_ERROR_CODES = {
  WRONG_DRIVER: 'WRONG_DRIVER',
} as const;

export type TrackingErrorCode = keyof typeof TRACKING_ERROR_CODES;

/** 403 — le chauffeur n'est pas actuellement affecté à ce véhicule (et/ou cette mission). */
export const wrongDriverPositionError = (message: string) =>
  new CodedHttpException(TRACKING_ERROR_CODES.WRONG_DRIVER, message, HttpStatus.FORBIDDEN);
