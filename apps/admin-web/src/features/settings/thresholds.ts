import type { AlertThreshold } from '@/features/settings/types';

/**
 * Reflet statique des seuils d'alerte de `apps/api/.env.example` — configurés uniquement par
 * variable d'environnement côté API, pas de mécanisme de stockage en base ni d'endpoint pour les
 * lire/modifier à l'exécution. Affichage lecture seule volontaire : construire une édition "en
 * direct" nécessiterait un nouveau mécanisme de stockage des paramètres côté backend, hors
 * périmètre de cet écran (voir note dans le rapport d'implémentation).
 *
 * Les valeurs par défaut ci-dessous sont copiées de `apps/api/.env.example` à la date d'écriture ;
 * elles peuvent différer de la configuration réelle d'un déploiement donné.
 */
export const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    envVar: 'MAX_GPS_ACCURACY_METERS',
    label: 'Précision GPS maximale',
    description:
      "Au-delà de ce seuil, la validation d'une étape de mission est rejetée (alerte LOW_GPS_ACCURACY).",
    defaultValue: '100',
    unit: 'mètres',
  },
  {
    envVar: 'MAX_PLAUSIBLE_SPEED_KMH',
    label: 'Vitesse implicite maximale',
    description:
      'Vitesse implicite maximale entre deux positions GPS successives ; au-delà, une alerte IMPOSSIBLE_SPEED (MEDIUM) est créée — la position est tout de même enregistrée.',
    defaultValue: '150',
    unit: 'km/h',
  },
  {
    envVar: 'VEHICLE_OFFLINE_THRESHOLD_MINUTES',
    label: 'Seuil de déconnexion véhicule',
    description:
      "Durée sans nouvelle position GPS au-delà de laquelle un véhicule est considéré OFFLINE (calculée par GET /tracking/vehicles/live et par la tâche planifiée VehicleOfflineCron).",
    defaultValue: '5',
    unit: 'minutes',
  },
  {
    envVar: 'MAX_PLAUSIBLE_FUEL_CONSUMPTION_L_PER_100KM',
    label: 'Consommation carburant maximale plausible',
    description: "Au-delà de ce seuil, un plein est jugé implausible (alerte FUEL_ANOMALY).",
    defaultValue: '40',
    unit: 'L/100km',
  },
  {
    envVar: 'MIN_HOURS_BETWEEN_FUEL_RECORDS',
    label: 'Délai minimum entre deux pleins',
    description:
      'Nombre d\'heures minimum entre deux déclarations de carburant pour le même véhicule avant qu\'une alerte FUEL_ANOMALY ne soit créée.',
    defaultValue: '2',
    unit: 'heures',
  },
];
