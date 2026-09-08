const STORAGE_KEY = 'tv_device_id';

/** Identifiant d'appareil stable côté navigateur, utilisé pour la détection "nouvel appareil" (OTP admin). */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
