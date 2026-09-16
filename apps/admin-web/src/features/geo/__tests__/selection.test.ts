import { describe, expect, it } from 'vitest';
import { CONTINENTS } from '@/features/geo/regions';
import {
  EMPTY_SELECTION,
  listCities,
  listCountries,
  listProvinces,
  narrowSelection,
  resolveTarget,
  selectionPath,
} from '@/features/geo/selection';
import { presetFor } from '@/features/geo/view-mode';

const AFRICA = 'africa';
const RDC = 'cd';
const NORD_KIVU = 'cd-nord-kivu';
const GOMA = 'cd-goma';

describe('jeu de données géographique', () => {
  it('expose la RDC et ses 26 provinces sous l’Afrique', () => {
    const africa = CONTINENTS.find((c) => c.id === AFRICA);
    const rdc = africa?.countries.find((c) => c.id === RDC);
    expect(rdc?.provinces).toHaveLength(26);
  });

  it('donne à chaque province au moins une ville et des coordonnées plausibles pour la RDC', () => {
    const provinces = listProvinces({ continentId: AFRICA, countryId: RDC });
    expect(provinces.length).toBeGreaterThan(0);
    for (const province of provinces) {
      expect(province.cities.length).toBeGreaterThan(0);
      for (const city of province.cities) {
        const [lng, lat] = city.center;
        // Emprise approximative de la RDC.
        expect(lng).toBeGreaterThan(11);
        expect(lng).toBeLessThan(32);
        expect(lat).toBeGreaterThan(-14);
        expect(lat).toBeLessThan(6);
      }
    }
  });

  it('n’utilise jamais deux fois le même identifiant de ville', () => {
    const ids = listProvinces({ continentId: AFRICA, countryId: RDC }).flatMap((p) => p.cities.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('cascade de sélection', () => {
  it('ne propose des pays qu’une fois le continent choisi', () => {
    expect(listCountries(EMPTY_SELECTION)).toHaveLength(0);
    expect(listCountries({ continentId: AFRICA })).toHaveLength(1);
  });

  it('réinitialise les niveaux plus fins quand on change de province', () => {
    const selection = { continentId: AFRICA, countryId: RDC, provinceId: NORD_KIVU, cityId: GOMA };
    const next = narrowSelection(selection, 'province', 'cd-haut-katanga');
    expect(next.cityId).toBeUndefined();
    expect(next.provinceId).toBe('cd-haut-katanga');
    expect(next.countryId).toBe(RDC);
  });

  it('vide toute la cascade quand on revient à la vue monde', () => {
    const selection = { continentId: AFRICA, countryId: RDC, provinceId: NORD_KIVU, cityId: GOMA };
    expect(narrowSelection(selection, 'continent', '')).toEqual({ continentId: undefined });
    expect(listCities(narrowSelection(selection, 'continent', ''))).toHaveLength(0);
  });
});

describe('cible de caméra', () => {
  it('ne cible rien tant que rien n’est sélectionné', () => {
    expect(resolveTarget(EMPTY_SELECTION)).toBeNull();
  });

  it('retient toujours le niveau le plus fin sélectionné', () => {
    expect(resolveTarget({ continentId: AFRICA })?.level).toBe('continent');
    expect(resolveTarget({ continentId: AFRICA, countryId: RDC })?.level).toBe('country');
    expect(resolveTarget({ continentId: AFRICA, countryId: RDC, provinceId: NORD_KIVU })?.level).toBe('province');

    const city = resolveTarget({ continentId: AFRICA, countryId: RDC, provinceId: NORD_KIVU, cityId: GOMA });
    expect(city?.level).toBe('city');
    expect(city?.name).toBe('Goma');
    expect(city?.zoom).toBeGreaterThan(10);
  });

  it('ignore une ville qui n’appartient pas à la province sélectionnée', () => {
    const target = resolveTarget({
      continentId: AFRICA,
      countryId: RDC,
      provinceId: NORD_KIVU,
      cityId: 'cd-lubumbashi',
    });
    expect(target?.level).toBe('province');
  });

  it('construit un fil d’Ariane du continent à la ville', () => {
    expect(selectionPath({ continentId: AFRICA, countryId: RDC, provinceId: NORD_KIVU, cityId: GOMA })).toEqual([
      'Afrique',
      'République démocratique du Congo',
      'Nord-Kivu',
      'Goma',
    ]);
  });
});

describe('modes d’affichage', () => {
  it('en mode combiné : globe au large, plan sur la province, relief 3D sur la ville', () => {
    expect(presetFor('auto', 'world').projection).toBe('globe');
    expect(presetFor('auto', 'country').projection).toBe('globe');
    expect(presetFor('auto', 'province')).toMatchObject({ projection: 'mercator', pitch: 0, terrain: false });
    expect(presetFor('auto', 'city')).toMatchObject({ projection: 'mercator', terrain: true, buildings3d: true });
    expect(presetFor('auto', 'city').pitch).toBeGreaterThan(0);
  });

  it('respecte un mode forcé quel que soit le niveau', () => {
    expect(presetFor('globe', 'city').projection).toBe('globe');
    expect(presetFor('plan', 'city')).toMatchObject({ projection: 'mercator', terrain: false, buildings3d: false });
    expect(presetFor('relief', 'world')).toMatchObject({ terrain: true, buildings3d: true });
  });
});
