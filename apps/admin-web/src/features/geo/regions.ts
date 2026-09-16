/**
 * Hiérarchie géographique continent → pays → province → ville utilisée par le sélecteur de région
 * des cartes (`features/geo/region-selector.tsx`).
 *
 * Jeu de données statique volontaire : il n'existe pas de référentiel administratif en base, et ces
 * entrées ne servent qu'à positionner la caméra de la carte. Pour ajouter un pays ou une ville, il
 * suffit d'étendre le tableau ci-dessous — aucune migration ni appel API n'est nécessaire.
 *
 * Coordonnées : centre-ville d'après OpenStreetMap/Nominatim (arrondi à 4 décimales, ~11 m). Le
 * centre d'une province est celui de son chef-lieu. `zoom` est le niveau d'ouverture de la carte.
 * Les continents sans pays configuré recadrent simplement la vue globe.
 */

export interface GeoNode {
  id: string;
  name: string;
  /** [longitude, latitude] — ordre attendu par MapLibre. */
  center: [number, number];
  zoom: number;
}

export interface GeoCity extends GeoNode {}

export interface GeoProvince extends GeoNode {
  chefLieu: string;
  cities: GeoCity[];
}

export interface GeoCountry extends GeoNode {
  provinces: GeoProvince[];
}

export interface GeoContinent extends GeoNode {
  countries: GeoCountry[];
}

/** Les 26 provinces de la RDC (découpage constitutionnel de 2015) et leurs villes principales. */
const RDC_PROVINCES: GeoProvince[] = [
    {
      id: 'cd-bas-uele',
      name: 'Bas-Uélé',
      chefLieu: 'Buta',
      center: [24.7287, 2.7933],
      zoom: 6.6,
      cities: [
        { id: 'cd-buta', name: 'Buta', center: [24.7287, 2.7933], zoom: 12.8 },
        { id: 'cd-aketi', name: 'Aketi', center: [23.744, 2.9313], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-haut-katanga',
      name: 'Haut-Katanga',
      chefLieu: 'Lubumbashi',
      center: [27.4826, -11.6642],
      zoom: 6.6,
      cities: [
        { id: 'cd-lubumbashi', name: 'Lubumbashi', center: [27.4826, -11.6642], zoom: 11.8 },
        { id: 'cd-likasi', name: 'Likasi', center: [26.7397, -10.9892], zoom: 12.8 },
        { id: 'cd-kipushi', name: 'Kipushi', center: [27.2365, -11.7602], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-haut-lomami',
      name: 'Haut-Lomami',
      chefLieu: 'Kamina',
      center: [25.0032, -8.7352],
      zoom: 6.6,
      cities: [
        { id: 'cd-kamina', name: 'Kamina', center: [25.0032, -8.7352], zoom: 12.8 },
        { id: 'cd-kabongo', name: 'Kabongo', center: [25.5062, -7.109], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-haut-uele',
      name: 'Haut-Uélé',
      chefLieu: 'Isiro',
      center: [27.6208, 2.7743],
      zoom: 6.6,
      cities: [
        { id: 'cd-isiro', name: 'Isiro', center: [27.6208, 2.7743], zoom: 12.8 },
        { id: 'cd-watsa', name: 'Watsa', center: [29.5328, 3.0399], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-ituri',
      name: 'Ituri',
      chefLieu: 'Bunia',
      center: [30.2479, 1.5621],
      zoom: 6.6,
      cities: [
        { id: 'cd-bunia', name: 'Bunia', center: [30.2479, 1.5621], zoom: 12.8 },
        { id: 'cd-mahagi', name: 'Mahagi', center: [30.5812, 2.3372], zoom: 12.8 },
        { id: 'cd-aru', name: 'Aru', center: [30.484, 3.0321], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kasai',
      name: 'Kasaï',
      chefLieu: 'Tshikapa',
      center: [20.5405, -6.6399],
      zoom: 6.6,
      cities: [
        { id: 'cd-tshikapa', name: 'Tshikapa', center: [20.5405, -6.6399], zoom: 12.8 },
        { id: 'cd-ilebo', name: 'Ilebo', center: [20.5883, -4.3316], zoom: 12.8 },
        { id: 'cd-luebo', name: 'Luebo', center: [21.385, -5.5922], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kasai-central',
      name: 'Kasaï-Central',
      chefLieu: 'Kananga',
      center: [22.4086, -5.8952],
      zoom: 6.6,
      cities: [
        { id: 'cd-kananga', name: 'Kananga', center: [22.4086, -5.8952], zoom: 12.0 },
        { id: 'cd-demba', name: 'Demba', center: [22.2733, -5.469], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kasai-oriental',
      name: 'Kasaï-Oriental',
      chefLieu: 'Mbuji-Mayi',
      center: [23.5998, -6.1259],
      zoom: 6.6,
      cities: [
        { id: 'cd-mbuji-mayi', name: 'Mbuji-Mayi', center: [23.5998, -6.1259], zoom: 11.8 },
        { id: 'cd-tshilenge', name: 'Tshilenge', center: [23.6296, -6.4695], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kinshasa',
      name: 'Kinshasa (ville-province)',
      chefLieu: 'Kinshasa',
      center: [15.3123, -4.3217],
      zoom: 9.5,
      cities: [
        { id: 'cd-kinshasa', name: 'Kinshasa', center: [15.3123, -4.3217], zoom: 11.2 },
      ],
    },
    {
      id: 'cd-kongo-central',
      name: 'Kongo-Central',
      chefLieu: 'Matadi',
      center: [13.4609, -5.8257],
      zoom: 6.6,
      cities: [
        { id: 'cd-matadi', name: 'Matadi', center: [13.4609, -5.8257], zoom: 12.4 },
        { id: 'cd-boma', name: 'Boma', center: [13.05, -5.85], zoom: 12.8 },
        { id: 'cd-muanda', name: 'Muanda (Moanda)', center: [12.378, -5.9282], zoom: 12.8 },
        { id: 'cd-mbanza-ngungu', name: 'Mbanza-Ngungu', center: [14.8667, -5.25], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kwango',
      name: 'Kwango',
      chefLieu: 'Kenge',
      center: [17.2717, -4.7176],
      zoom: 6.6,
      cities: [
        { id: 'cd-kenge', name: 'Kenge', center: [17.2717, -4.7176], zoom: 12.8 },
        { id: 'cd-popokabaka', name: 'Popokabaka', center: [16.5841, -5.6932], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-kwilu',
      name: 'Kwilu',
      chefLieu: 'Bandundu',
      center: [18.2941, -4.4138],
      zoom: 6.6,
      cities: [
        { id: 'cd-bandundu', name: 'Bandundu', center: [18.2941, -4.4138], zoom: 12.8 },
        { id: 'cd-kikwit', name: 'Kikwit', center: [18.8178, -5.0383], zoom: 12.2 },
        { id: 'cd-idiofa', name: 'Idiofa', center: [19.5885, -4.9699], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-lomami',
      name: 'Lomami',
      chefLieu: 'Kabinda',
      center: [24.4869, -6.1319],
      zoom: 6.6,
      cities: [
        { id: 'cd-kabinda', name: 'Kabinda', center: [24.4869, -6.1319], zoom: 12.8 },
        { id: 'cd-mwene-ditu', name: 'Mwene-Ditu', center: [23.3919, -6.9357], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-lualaba',
      name: 'Lualaba',
      chefLieu: 'Kolwezi',
      center: [25.467, -10.717],
      zoom: 6.6,
      cities: [
        { id: 'cd-kolwezi', name: 'Kolwezi', center: [25.467, -10.717], zoom: 12.2 },
        { id: 'cd-dilolo', name: 'Dilolo', center: [22.3435, -10.6866], zoom: 12.8 },
        { id: 'cd-kasaji', name: 'Kasaji', center: [23.4499, -10.3834], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-mai-ndombe',
      name: 'Mai-Ndombe',
      chefLieu: 'Inongo',
      center: [18.2864, -1.9253],
      zoom: 6.6,
      cities: [
        { id: 'cd-inongo', name: 'Inongo', center: [18.2864, -1.9253], zoom: 12.8 },
        { id: 'cd-nioki', name: 'Nioki', center: [17.6854, -2.7204], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-maniema',
      name: 'Maniema',
      chefLieu: 'Kindu',
      center: [25.9231, -2.9439],
      zoom: 6.6,
      cities: [
        { id: 'cd-kindu', name: 'Kindu', center: [25.9231, -2.9439], zoom: 12.8 },
        { id: 'cd-kasongo', name: 'Kasongo', center: [26.541, -4.1751], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-mongala',
      name: 'Mongala',
      chefLieu: 'Lisala',
      center: [21.5157, 2.1474],
      zoom: 6.6,
      cities: [
        { id: 'cd-lisala', name: 'Lisala', center: [21.5157, 2.1474], zoom: 12.8 },
        { id: 'cd-bumba', name: 'Bumba', center: [22.4665, 2.1837], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-nord-kivu',
      name: 'Nord-Kivu',
      chefLieu: 'Goma',
      center: [29.2257, -1.6666],
      zoom: 6.6,
      cities: [
        { id: 'cd-goma', name: 'Goma', center: [29.2257, -1.6666], zoom: 12.4 },
        { id: 'cd-butembo', name: 'Butembo', center: [29.292, 0.125], zoom: 12.8 },
        { id: 'cd-beni', name: 'Beni', center: [29.2117, 0.3974], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-nord-ubangi',
      name: 'Nord-Ubangi',
      chefLieu: 'Gbadolite',
      center: [20.9999, 4.2812],
      zoom: 6.6,
      cities: [
        { id: 'cd-gbadolite', name: 'Gbadolite', center: [20.9999, 4.2812], zoom: 12.8 },
        { id: 'cd-businga', name: 'Businga', center: [20.8882, 3.3412], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-sankuru',
      name: 'Sankuru',
      chefLieu: 'Lusambo',
      center: [23.6129, -6.1095],
      zoom: 6.6,
      cities: [
        { id: 'cd-lusambo', name: 'Lusambo', center: [23.6129, -6.1095], zoom: 12.8 },
        { id: 'cd-lodja', name: 'Lodja', center: [23.5995, -3.5242], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-sud-kivu',
      name: 'Sud-Kivu',
      chefLieu: 'Bukavu',
      center: [28.8595, -2.5056],
      zoom: 6.6,
      cities: [
        { id: 'cd-bukavu', name: 'Bukavu', center: [28.8595, -2.5056], zoom: 12.6 },
        { id: 'cd-uvira', name: 'Uvira', center: [29.1376, -3.4056], zoom: 12.8 },
        { id: 'cd-baraka', name: 'Baraka', center: [29.0951, -4.1056], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-sud-ubangi',
      name: 'Sud-Ubangi',
      chefLieu: 'Gemena',
      center: [19.7751, 3.2549],
      zoom: 6.6,
      cities: [
        { id: 'cd-gemena', name: 'Gemena', center: [19.7751, 3.2549], zoom: 12.8 },
        { id: 'cd-zongo', name: 'Zongo', center: [18.5946, 4.3437], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-tanganyika',
      name: 'Tanganyika',
      chefLieu: 'Kalemie',
      center: [29.1967, -5.946],
      zoom: 6.6,
      cities: [
        { id: 'cd-kalemie', name: 'Kalemie', center: [29.1967, -5.946], zoom: 12.8 },
        { id: 'cd-moba', name: 'Moba', center: [27.4821, -11.7044], zoom: 12.8 },
        { id: 'cd-manono', name: 'Manono', center: [27.3965, -7.2981], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-tshopo',
      name: 'Tshopo',
      chefLieu: 'Kisangani',
      center: [25.2057, 0.5184],
      zoom: 6.6,
      cities: [
        { id: 'cd-kisangani', name: 'Kisangani', center: [25.2057, 0.5184], zoom: 12.0 },
        { id: 'cd-isangi', name: 'Isangi', center: [24.2691, 0.7795], zoom: 12.8 },
        { id: 'cd-yangambi', name: 'Yangambi', center: [24.4734, 0.7658], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-tshuapa',
      name: 'Tshuapa',
      chefLieu: 'Boende',
      center: [20.8826, -0.2837],
      zoom: 6.6,
      cities: [
        { id: 'cd-boende', name: 'Boende', center: [20.8826, -0.2837], zoom: 12.8 },
      ],
    },
    {
      id: 'cd-equateur',
      name: 'Équateur',
      chefLieu: 'Mbandaka',
      center: [18.2565, 0.0471],
      zoom: 6.6,
      cities: [
        { id: 'cd-mbandaka', name: 'Mbandaka', center: [18.2565, 0.0471], zoom: 12.8 },
        { id: 'cd-bikoro', name: 'Bikoro', center: [18.2552, -0.7585], zoom: 12.8 },
      ],
    },
];

export const CONTINENTS: GeoContinent[] = [
  {
    id: 'africa',
    name: 'Afrique',
    center: [19.0, 2.0],
    zoom: 2.6,
    countries: [
      {
        id: 'cd',
        name: 'République démocratique du Congo',
        center: [23.66, -2.88],
        zoom: 4.2,
        provinces: RDC_PROVINCES,
      },
    ],
  },
  // Continents sans pays configuré : la sélection recadre la vue, la liste des pays reste vide
  // tant qu'aucun n'est ajouté ici.
  { id: 'europe', name: 'Europe', center: [15.0, 54.0], zoom: 2.9, countries: [] },
  { id: 'asia', name: 'Asie', center: [95.0, 35.0], zoom: 2.3, countries: [] },
  { id: 'north-america', name: 'Amérique du Nord', center: [-100.0, 45.0], zoom: 2.3, countries: [] },
  { id: 'south-america', name: 'Amérique du Sud', center: [-60.0, -15.0], zoom: 2.6, countries: [] },
  { id: 'oceania', name: 'Océanie', center: [140.0, -25.0], zoom: 2.7, countries: [] },
];
