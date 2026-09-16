'use client';

import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  listCities,
  listContinents,
  listCountries,
  listProvinces,
  narrowSelection,
  type RegionSelection,
} from '@/features/geo/selection';
import { MAP_VIEW_MODES, type MapViewMode } from '@/features/geo/view-mode';

export interface RegionSelectorProps {
  selection: RegionSelection;
  onSelectionChange: (selection: RegionSelection) => void;
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  /** Disposition compacte (colonne) pour les panneaux étroits, ex. le formulaire de point. */
  compact?: boolean;
  /** Contrôles réduits, pour l'overlay posé sur la carte. */
  dense?: boolean;
}

/**
 * Sélecteur en cascade continent → pays → province → ville, piloté par le jeu de données statique
 * de `features/geo/regions.ts`. Chaque niveau ne propose que les entrées du niveau parent, et
 * changer un niveau réinitialise les niveaux plus fins (voir `narrowSelection`).
 */
export function RegionSelector({
  selection,
  onSelectionChange,
  viewMode,
  onViewModeChange,
  compact = false,
  dense = false,
}: RegionSelectorProps) {
  const continents = listContinents();
  const countries = listCountries(selection);
  const provinces = listProvinces(selection);
  const cities = listCities(selection);

  const fieldClass = compact ? 'space-y-1' : `space-y-1 flex-1 ${dense ? 'min-w-[8.5rem]' : 'min-w-[10rem]'}`;
  const selectClass = dense ? 'h-8 text-xs' : undefined;

  return (
    <div className={compact ? 'space-y-3' : 'flex flex-wrap items-end gap-3'}>
      <div className={fieldClass}>
        <Label htmlFor="region-continent" className="text-xs">
          Continent
        </Label>
        <Select
          className={selectClass}
          id="region-continent"
          value={selection.continentId ?? ''}
          onChange={(e) => onSelectionChange(narrowSelection(selection, 'continent', e.target.value))}
        >
          <option value="">Vue monde</option>
          {continents.map((continent) => (
            <option key={continent.id} value={continent.id}>
              {continent.name}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="region-country" className="text-xs">
          Pays
        </Label>
        <Select
          className={selectClass}
          id="region-country"
          value={selection.countryId ?? ''}
          disabled={countries.length === 0}
          onChange={(e) => onSelectionChange(narrowSelection(selection, 'country', e.target.value))}
        >
          <option value="">{countries.length === 0 ? 'Aucun pays configuré' : 'Tous les pays'}</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="region-province" className="text-xs">
          Province
        </Label>
        <Select
          className={selectClass}
          id="region-province"
          value={selection.provinceId ?? ''}
          disabled={provinces.length === 0}
          onChange={(e) => onSelectionChange(narrowSelection(selection, 'province', e.target.value))}
        >
          <option value="">{provinces.length === 0 ? 'Sélectionnez un pays' : 'Toutes les provinces'}</option>
          {provinces.map((province) => (
            <option key={province.id} value={province.id}>
              {province.name}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="region-city" className="text-xs">
          Ville
        </Label>
        <Select
          className={selectClass}
          id="region-city"
          value={selection.cityId ?? ''}
          disabled={cities.length === 0}
          onChange={(e) => onSelectionChange(narrowSelection(selection, 'city', e.target.value))}
        >
          <option value="">{cities.length === 0 ? 'Sélectionnez une province' : 'Toutes les villes'}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="region-view-mode" className="text-xs">
          Affichage
        </Label>
        <Select
          className={selectClass}
          id="region-view-mode"
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as MapViewMode)}
        >
          {MAP_VIEW_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
