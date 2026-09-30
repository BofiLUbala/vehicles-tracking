'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_LINKS, isActivePath } from '@/components/nav-links';
import { cn } from '@/lib/utils';
import { logout } from '@/features/auth/api';
import { useCurrentUser } from '@/features/auth/current-user';
import { fetchAlerts } from '@/features/alerts/api';
import { BrandMark } from '@/components/brand-mark';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Superviseur',
  ADMIN: 'Administrateur',
  DRIVER: 'Chauffeur',
};

/** Préférence de l'utilisateur : barre latérale réduite aux icônes (navigateur uniquement). */
const COLLAPSED_STORAGE_KEY = 'sidebar.collapsed';

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  // Réduite, la barre ne garde que les icônes : la carte et les tableaux gagnent ~180 px de large.
  const [collapsed, setCollapsed] = useState(false);

  // Lecture après montage : `localStorage` n'existe pas au rendu serveur et peut être bloqué.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true') setCollapsed(true);
    } catch {
      // stockage indisponible : barre dépliée par défaut
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // préférence non mémorisée, sans conséquence
      }
      return next;
    });
  }

  const { data: currentUser } = useCurrentUser();
  const { data: openAlerts } = useQuery({
    queryKey: ['alerts', 'count-open'],
    queryFn: () => fetchAlerts({ status: 'NEW' }),
    refetchInterval: 60_000,
  });

  const roleLabel = currentUser ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : 'Administrateur';
  const initials = roleLabel.slice(0, 2).toUpperCase();
  const alertCount = openAlerts?.length ?? 0;

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col bg-navy text-slate-300 transition-[width] duration-200',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div className={cn('flex flex-col gap-2 py-4', collapsed ? 'items-center px-2' : 'px-4')}>
        {!collapsed && (
          <>
            <BrandMark inverted className="w-full" />
            <p className="text-center text-2xs font-medium uppercase tracking-wider text-slate-400">
              Tracking Vehicles · Console opérationnelle
            </p>
          </>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white',
            collapsed ? 'justify-center' : 'self-end',
          )}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!collapsed && <span>Réduire</span>}
        </button>
      </div>

      <div className={cn('mb-2 border-t border-white/10', collapsed ? 'mx-3' : 'mx-5')} />

      <nav className={cn('flex-1 space-y-1 overflow-y-auto py-2', collapsed ? 'px-2' : 'px-3')}>
        {NAV_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href);
          const Icon = link.icon;
          const showBadge = link.badgeKey === 'alerts' && alertCount > 0;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              aria-label={collapsed ? link.label : undefined}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
                collapsed ? 'justify-center px-0' : 'px-3',
                active && 'bg-navy font-semibold text-white shadow-md shadow-navy/30 hover:bg-navy',
              )}
            >
              <span className="relative">
                <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
                {collapsed && showBadge && (
                  <span aria-hidden className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-navy" />
                )}
              </span>
              {!collapsed && <span className="flex-1 truncate">{link.label}</span>}
              {!collapsed && showBadge && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold text-white">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3 rounded-lg py-2', collapsed ? 'flex-col px-0' : 'px-2')}>
          <div
            title={collapsed ? `Admin · ${roleLabel}` : undefined}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-foreground ring-2 ring-primary/40"
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-sm font-semibold text-white">Admin</p>
              <p className="truncate text-2xs text-slate-400">{roleLabel}</p>
            </div>
          )}
          <button
            type="button"
            aria-label="Déconnexion"
            title={collapsed ? 'Déconnexion' : undefined}
            onClick={handleLogout}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-danger/20 hover:text-danger-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
