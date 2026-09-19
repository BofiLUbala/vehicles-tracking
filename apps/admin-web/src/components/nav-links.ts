import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Car,
  Droplets,
  FileText,
  LayoutDashboard,
  MapPin,
  Radar,
  Route,
  ScrollText,
  ShieldAlert,
  Settings,
  UserRound,
  Users,
  ClipboardList,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Icône alternative affichée quand l'entrée est active. */
  activeIcon?: LucideIcon;
  /** Affiche un compteur (badge rouge) — ex. alertes ouvertes. */
  badgeKey?: 'alerts';
}

export const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/missions', label: 'Missions', icon: ClipboardList },
  { href: '/tracking', label: 'Suivi en temps réel', icon: Radar },
  { href: '/vehicles', label: 'Véhicules', icon: Car },
  { href: '/drivers', label: 'Chauffeurs', icon: UserRound },
  { href: '/locations', label: 'Lieux', icon: MapPin },
  { href: '/fuel', label: 'Carburant', icon: Droplets },
  { href: '/alerts', label: 'Alertes', icon: ShieldAlert, badgeKey: 'alerts' },
  { href: '/reports', label: 'Rapports', icon: FileText },
  { href: '/audit', label: 'Journal d’audit', icon: ScrollText },
  { href: '/users', label: 'Utilisateurs', icon: Users },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

/** Sections du menu regroupées pour l'affichage. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}