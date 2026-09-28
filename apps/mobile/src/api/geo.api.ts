import { apiClient } from './client';

export interface ReverseGeocodeResult {
  address: string | null;
  street: string | null;
  municipality: string | null;
}

// Même arrondi que le cache serveur (~11 m) : un arrêt revu ne coûte aucun appel.
const cache = new Map<string, Promise<ReverseGeocodeResult | null>>();

export const GeoApi = {
  /** Adresse lisible d'un point (TomTom via le backend). `null` si indisponible, jamais d'exception. */
  reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const request = apiClient
      .get<ReverseGeocodeResult>('/mobile/geocode/reverse', { params: { lat: latitude, lng: longitude } })
      .then((r) => r.data ?? null)
      .catch(() => {
        cache.delete(key); // échec (hors ligne…) : on retentera plus tard
        return null;
      });
    cache.set(key, request);
    return request;
  },
};
