/**
 * Fond de carte partagé par toutes les cartes de l'admin.
 *
 * Défaut : le style « liberty » d'OpenFreeMap (OpenStreetMap, sans clé d'API), qui fournit les
 * villes, les routes et surtout la couche d'extrusion `building-3d` nécessaire à la vue 3D. Le
 * style de démonstration MapLibre utilisé auparavant ne contient que les frontières des pays.
 * Surchargeable par `NEXT_PUBLIC_MAP_STYLE_URL` (style auto-hébergé ou fournisseur avec clé).
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';
