/** Libellés français des actions et entités du journal d'audit (source unique pour le tableau). */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.signup': 'Inscription chauffeur',
  'auth.login': 'Connexion',
  'auth.login.new_device': 'Connexion (nouvel appareil)',
  'auth.refresh.reuse_detected': 'Rejeu de jeton détecté',
  'auth.password_changed': 'Mot de passe modifié',
  'super_admin.registered': 'Super-administrateur enregistré',
  'admin.invitation.accepted': 'Invitation acceptée',
  'otp.requested': 'Code de connexion demandé',
  'otp.verify.failed': 'Échec de vérification du code',
  'alert.status.updated': 'Statut alerte modifié',
  'mission.cancel': 'Mission annulée',
  'mission_step.validation.rejected': 'Validation d’étape rejetée',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  user: 'Utilisateur',
  driver: 'Chauffeur',
  vehicle: 'Véhicule',
  mission: 'Mission',
  Mission: 'Mission',
  operator: 'Opérateur',
  user_session: 'Session',
  otp_request: 'Demande de code',
  Alert: 'Alerte',
  MissionStep: 'Étape de mission',
};

export function auditActionToLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityToLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}