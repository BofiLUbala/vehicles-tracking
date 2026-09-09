export interface NavLink {
  href: string;
  label: string;
  /** Écrans hors périmètre de cette phase — affichés mais désactivés ("bientôt disponible"). */
  comingSoon?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { href: '/tracking', label: 'Carte temps réel' },
  { href: '/missions', label: 'Missions' },
  { href: '/drivers', label: 'Chauffeurs' },
  { href: '/vehicles', label: 'Véhicules' },
  { href: '/locations', label: 'Points géographiques' },
  { href: '/fuel', label: 'Carburant' },
  { href: '/alerts', label: 'Alertes' },
  { href: '/reports', label: 'Rapports' },
  { href: '/users', label: 'Utilisateurs' },
  { href: '/settings', label: 'Paramètres' },
];
