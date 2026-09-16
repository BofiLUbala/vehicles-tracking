import { describe, it, expect } from 'vitest';
import {
  frenchMessageForErrorCode,
  frenchMessageForFuelErrorCode,
} from '../utils/error-messages';

describe('Error Code Message Translators', () => {
  describe('Step Validation Error Codes', () => {
    it('translates OUT_OF_RANGE', () => {
      const msg = frenchMessageForErrorCode('OUT_OF_RANGE');
      expect(msg).toContain('trop loin du point');
    });

    it('translates INVALID_QR', () => {
      const msg = frenchMessageForErrorCode('INVALID_QR');
      expect(msg).toContain('QR code invalide');
    });

    it('translates WRONG_STEP_ORDER', () => {
      const msg = frenchMessageForErrorCode('WRONG_STEP_ORDER');
      expect(msg).toContain('étape précédente');
    });

    it('translates MISSING_PHOTO', () => {
      const msg = frenchMessageForErrorCode('MISSING_PHOTO');
      expect(msg).toContain('Photo manquante');
    });

    it('translates WINDOW_EXPIRED', () => {
      const msg = frenchMessageForErrorCode('WINDOW_EXPIRED');
      expect(msg).toContain('délai');
    });

    it('translates MOCKED_LOCATION', () => {
      const msg = frenchMessageForErrorCode('MOCKED_LOCATION');
      expect(msg).toContain('Position GPS suspecte');
    });

    it('translates NETWORK_ERROR', () => {
      const msg = frenchMessageForErrorCode('NETWORK_ERROR');
      expect(msg).toContain('Connexion impossible');
    });

    it('falls back to custom message or default', () => {
      expect(frenchMessageForErrorCode('CUSTOM_CODE', 'Mon message')).toBe('Mon message');
      expect(frenchMessageForErrorCode(undefined)).toContain('Une erreur est survenue');
    });
  });

  describe('Fuel Error Codes', () => {
    it('translates MISSING_PHOTO', () => {
      const msg = frenchMessageForFuelErrorCode('MISSING_PHOTO');
      expect(msg).toContain('reçu et le compteur');
    });

    it('translates INVALID_VEHICLE', () => {
      const msg = frenchMessageForFuelErrorCode('INVALID_VEHICLE');
      expect(msg).toContain('véhicule est introuvable');
    });

    it('translates NETWORK_ERROR', () => {
      const msg = frenchMessageForFuelErrorCode('NETWORK_ERROR');
      expect(msg).toContain('Connexion impossible');
    });
  });
});
