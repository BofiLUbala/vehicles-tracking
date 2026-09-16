import type { GeoLevel } from '@/features/geo/selection';

/**
 * Modes d'affichage de la carte.
 * - `auto` : la vue suit le niveau sélectionné (globe pour le monde/continent/pays, plan pour la
 *   province, relief 3D pour la ville) — c'est la « combinaison » attendue par défaut.
 * - `globe` / `plan` / `relief` : l'utilisateur force un rendu.
 */
export type MapViewMode = 'auto' | 'globe' | 'plan' | 'relief';

export const MAP_VIEW_MODES: { value: MapViewMode; label: string }[] = [
  { value: 'auto', label: 'Combiné (suit la sélection)' },
  { value: 'globe', label: 'Globe 3D' },
  { value: 'plan', label: 'Plan 2D' },
  { value: 'relief', label: 'Relief 3D' },
];

export interface CameraPreset {
  projection: 'globe' | 'mercator';
  /** Inclinaison de la caméra en degrés (0 = vue du dessus). */
  pitch: number;
  /** Active le modèle numérique de terrain (relief). */
  terrain: boolean;
  /** Affiche l'extrusion 3D des bâtiments (visible seulement à partir du zoom 14 du style). */
  buildings3d: boolean;
}

const GLOBE: CameraPreset = { projection: 'globe', pitch: 0, terrain: false, buildings3d: false };
const PLAN: CameraPreset = { projection: 'mercator', pitch: 0, terrain: false, buildings3d: false };
const RELIEF: CameraPreset = { projection: 'mercator', pitch: 60, terrain: true, buildings3d: true };

/** Réglages de caméra à appliquer pour un mode et un niveau de sélection donnés. */
export function presetFor(mode: MapViewMode, level: GeoLevel): CameraPreset {
  switch (mode) {
    case 'globe':
      return GLOBE;
    case 'plan':
      return PLAN;
    case 'relief':
      return RELIEF;
    case 'auto':
      if (level === 'city') return RELIEF;
      if (level === 'province') return PLAN;
      return GLOBE;
  }
}
