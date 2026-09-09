export interface NavLink {
  href: string;
  label: string;
  /** Écrans hors périmètre de cette phase — affichés mais désactivés ("bientôt disponible"). */
  comingSoon?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/tracking', label: 'Carte temps réel' },
  { href: '/missions', label: 'Missions', comingSoon: true },
  { href: '/drivers', label: 'Chauffeurs', comingSoon: true },
  { href: '/vehicles', label: 'Véhicules', comingSoon: true },
  { href: '/locations', label: 'Points géographiques', comingSoon: true },
  { href: '/fuel', label: 'Carburant' },
  { href: '/alerts', label: 'Alertes' },
  { href: '/reports', label: 'Rapports' },
  { href: '/users', label: 'Utilisateurs', comingSoon: true },
  { href: '/settings', label: 'Paramètres', comingSoon: true },
];
