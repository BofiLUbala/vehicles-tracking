import { CONTINENTS, type GeoContinent, type GeoCountry, type GeoProvince, type GeoCity } from '@/features/geo/regions';

/** Niveaux de la hiérarchie géographique, du plus large au plus fin. */
export type GeoLevel = 'world' | 'continent' | 'country' | 'province' | 'city';

export interface RegionSelection {
  continentId?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
}

export interface CameraTarget {
  /** [longitude, latitude] — ordre MapLibre. */
  center: [number, number];
  zoom: number;
  level: GeoLevel;
  /** Libellé lisible du lieu ciblé, pour l'affichage. */
  name: string;
}

export const EMPTY_SELECTION: RegionSelection = {};

export function listContinents(): GeoContinent[] {
  return CONTINENTS;
}

export function findContinent(selection: RegionSelection): GeoContinent | null {
  return CONTINENTS.find((c) => c.id === selection.continentId) ?? null;
}

export function listCountries(selection: RegionSelection): GeoCountry[] {
  return findContinent(selection)?.countries ?? [];
}

export function findCountry(selection: RegionSelection): GeoCountry | null {
  return listCountries(selection).find((c) => c.id === selection.countryId) ?? null;
}

export function listProvinces(selection: RegionSelection): GeoProvince[] {
  return findCountry(selection)?.provinces ?? [];
}

export function findProvince(selection: RegionSelection): GeoProvince | null {
  return listProvinces(selection).find((p) => p.id === selection.provinceId) ?? null;
}

export function listCities(selection: RegionSelection): GeoCity[] {
  return findProvince(selection)?.cities ?? [];
}

export function findCity(selection: RegionSelection): GeoCity | null {
  return listCities(selection).find((c) => c.id === selection.cityId) ?? null;
}

/**
 * Applique un choix à un niveau donné en réinitialisant les niveaux plus fins : changer de province
 * ne doit jamais laisser la ville précédente (qui appartient à une autre province) sélectionnée.
 * `id` vide remet le niveau à zéro (option « Toutes/Tous »).
 */
export function narrowSelection(
  selection: RegionSelection,
  level: Exclude<GeoLevel, 'world'>,
  id: string,
): RegionSelection {
  const value = id || undefined;
  switch (level) {
    case 'continent':
      return { continentId: value };
    case 'country':
      return { continentId: selection.continentId, countryId: value };
    case 'province':
      return { continentId: selection.continentId, countryId: selection.countryId, provinceId: value };
    case 'city':
      return { ...selection, cityId: value };
  }
}

/** Lieu le plus fin réellement sélectionné, ou `null` si la sélection est vide (vue monde). */
export function resolveTarget(selection: RegionSelection): CameraTarget | null {
  const city = findCity(selection);
  if (city) return { center: city.center, zoom: city.zoom, level: 'city', name: city.name };

  const province = findProvince(selection);
  if (province) return { center: province.center, zoom: province.zoom, level: 'province', name: province.name };

  const country = findCountry(selection);
  if (country) return { center: country.center, zoom: country.zoom, level: 'country', name: country.name };

  const continent = findContinent(selection);
  if (continent) return { center: continent.center, zoom: continent.zoom, level: 'continent', name: continent.name };

  return null;
}

/** Fil d'Ariane du lieu sélectionné, du continent à la ville. */
export function selectionPath(selection: RegionSelection): string[] {
  return [findContinent(selection), findCountry(selection), findProvince(selection), findCity(selection)]
    .filter((node): node is NonNullable<typeof node> => node !== null)
    .map((node) => node.name);
}
