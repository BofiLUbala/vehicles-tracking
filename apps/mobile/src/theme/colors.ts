/**
 * Thème « Fleet Control » — palette unifiée avec l'admin web.
 * - Bleus : navy profond (#0B1F33) pour les surfaces sombres, primary (#0B8FCB) pour l'action,
 *   tracking (#1479FF) pour le suivi/GPS.
 * - Sémantiques : success (#18A957), warning (#F59E0B), danger (#E53E3E).
 * - Neutres : fond #F5F7FA, cartes blanches, texte #101828 / #667085 / #98A2B3, bordures #E4E7EC.
 */

export const AppTheme = {
  // Marque
  navy: '#0B1F33',
  navyLight: '#1E3A5F',
  primary: '#0B8FCB',
  primaryDark: '#096A99',
  primaryLight: 'rgba(11, 143, 203, 0.10)',

  tracking: '#1479FF',
  trackingLight: 'rgba(20, 121, 255, 0.10)',

  // Neutres
  background: '#F5F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E4E7EC',
  subtle: '#F0F3F7',

  text: '#101828',
  textSecondary: '#667085',
  textMuted: '#98A2B3',

  // Sémantiques
  success: '#18A957',
  successLight: 'rgba(24, 169, 87, 0.10)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  danger: '#E53E3E',
  dangerLight: 'rgba(229, 62, 62, 0.10)',
  info: '#1479FF',
  infoLight: 'rgba(20, 121, 255, 0.10)',
  suspicious: '#7C2D12',
  suspiciousLight: 'rgba(124, 58, 237, 0.12)',
  offline: '#98A2B3',

  // Couleurs de statut — alignées avec `STATUS_COLORS` de l'admin web
  status: {
    PLANNED: '#98A2B3',
    ASSIGNED: '#0B8FCB',
    STARTED: '#1479FF',
    IN_PROGRESS: '#1479FF',
    COMPLETED: '#18A957',
    CANCELLED: '#98A2B3',
    LATE: '#F59E0B',
    SUSPICIOUS: '#E53E3E',
    NOT_COMPLETED: '#E53E3E',
    MOVING: '#18A957',
    ON_MISSION: '#1479FF',
    STOPPED: '#F59E0B',
    OFFLINE: '#98A2B3',
  },
};

/** Rayons de coins de l'app (12–18 px, cartes et boutons). */
export const AppRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  pill: 999,
};

/** Espacements verticaux/horizontaux courants. */
export const AppSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

/** Ombres type « carte » (douces, discrètes). */
export const AppShadow = {
  card: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pop: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};