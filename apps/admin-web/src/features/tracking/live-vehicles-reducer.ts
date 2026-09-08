import type { LiveVehicle, VehiclePositionUpdatedEvent } from '@/features/tracking/types';

/**
 * Applique un événement `vehicle.position.updated` à la liste de véhicules en mémoire, sans
 * recréer les entrées non concernées (permet une mise à jour incrémentale du marqueur MapLibre
 * correspondant plutôt qu'un re-rendu complet). Fonction pure — testée indépendamment du socket
 * et de la carte.
 *
 * Le payload de l'événement (voir `docs/PHASE3_NOTES.md`) ne contient PAS de statut — seul le
 * statut dérivé côté backend (via `vehicle.status.updated`, non encore émis automatiquement en
 * Phase 3) peut le changer ; on le laisse donc inchangé ici.
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
      speedKmh: event.speed,
      heading: event.heading,
      lastUpdateAt: event.recordedAt,
    };
  });
  // Véhicule inconnu (pas dans le seed initial) : on ignore plutôt que d'insérer une entrée
  // incomplète (pas de plaque dans le payload de l'événement).
  return found ? next : vehicles;
}
