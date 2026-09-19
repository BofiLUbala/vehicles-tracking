import type {
  LiveVehicle,
  VehiclePositionUpdatedEvent,
  VehicleStatusUpdatedEvent,
  VehicleTrackingStatus,
} from '@/features/tracking/types';

/**
 * Applique un événement `vehicle.position.updated` à la liste de véhicules en mémoire, sans
 * recréer les entrées non concernées (permet une mise à jour incrémentale du marqueur MapLibre
 * correspondant plutôt qu'un re-rendu complet). Fonction pure — testée indépendamment du socket
 * et de la carte.
 *
 * Le payload de l'événement ne contient PAS de statut — celui-ci arrive séparément via
 * `vehicle.status.updated` (voir `applyStatusUpdate`). Si l'événement contient un `missionId`, on
 * met à jour `activeMissionId` du véhicule pour refléter l'association en cours.
 */
export function applyPositionUpdate(
  vehicles: LiveVehicle[],
  event: VehiclePositionUpdatedEvent,
): LiveVehicle[] {
  let found = false;
  const next = vehicles.map((vehicle) => {
    if (vehicle.id !== event.vehicleId) return vehicle;
    found = true;
    return {
      ...vehicle,
      position: { lat: event.latitude, lng: event.longitude },
      accuracy: event.accuracy,
      speedKmh: event.speed,
      heading: event.heading,
      lastUpdateAt: event.recordedAt,
      activeMissionId: event.missionId ?? vehicle.activeMissionId,
    };
  });
  // Véhicule inconnu (pas dans le seed initial) : on ignore plutôt que d'insérer une entrée
  // incomplète (pas de plaque dans le payload de l'événement).
  return found ? next : vehicles;
}

/**
 * Applique un événement `vehicle.status.updated` (statut dérivé côté backend, émis à chaque
 * ingestion de position et par le balayage offline). Conservée pure et idempotente : ne recrée pas
 * les entrées non concernées, et ignore un statut déjà à jour pour éviter un re-rendu inutile.
 */
export function applyStatusUpdate(
  vehicles: LiveVehicle[],
  event: VehicleStatusUpdatedEvent,
): LiveVehicle[] {
  const target = vehicles.find((vehicle) => vehicle.id === event.vehicleId);
  if (!target || target.status === event.status) return vehicles;
  return vehicles.map((vehicle) =>
    vehicle.id === event.vehicleId
      ? { ...vehicle, status: event.status as VehicleTrackingStatus }
      : vehicle,
  );
}

/**
 * Applique un événement `vehicle.offline` (balayage périodique) : position conservée mais statut
 * forcé à OFFLINE. Le backend émet aussi `vehicle.status.updated` avec OFFLINE ; cette fonction
 * couvre les clients qui n'écoutent que `vehicle.offline`.
 */
export function applyOfflineUpdate(vehicles: LiveVehicle[], vehicleId: string): LiveVehicle[] {
  const target = vehicles.find((vehicle) => vehicle.id === vehicleId);
  if (!target || target.status === 'OFFLINE') return vehicles;
  return vehicles.map((vehicle) => (vehicle.id === vehicleId ? { ...vehicle, status: 'OFFLINE' } : vehicle));
}
