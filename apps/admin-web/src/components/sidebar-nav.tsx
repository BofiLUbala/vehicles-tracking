'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
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

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: currentUser } = useCurrentUser();
  const { data: openAlerts } = useQuery({
    queryKey: ['alerts', 'count-open'],
    queryFn: () => fetchAlerts({ status: 'NEW' }),
    refetchInterval: 60_000,
  });

  const roleLabel = currentUser ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : 'Administrateur';
  const initials = roleLabel.slice(0, 2).toUpperCase();

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-navy text-slate-300">
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandMark inverted />
        <div className="flex flex-col">
          <p className="text-sm font-bold leading-tight text-white">Tracking Vehicles</p>
          <p className="text-2xs font-medium uppercase tracking-wider text-slate-400">Console opérationnelle</p>
        </div>
      </div>

      <div className="mx-5 mb-2 border-t border-white/10" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white',
                active && 'bg-navy font-semibold text-white shadow-md shadow-navy/30 hover:bg-navy',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-white' : 'text-slate-400 group-hover:text-white')} />
              <span className="flex-1 truncate">{link.label}</span>
              {link.badgeKey === 'alerts' && openAlerts && openAlerts.length > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-2xs font-bold text-white">
                  {openAlerts.length > 99 ? '99+' : openAlerts.length}
                </span>
              )}
              {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-foreground ring-2 ring-primary/40">
            {initials}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-sm font-semibold text-white">Admin</p>
            <p className="truncate text-2xs text-slate-400">{roleLabel}</p>
          </div>
          <button
            type="button"
            aria-label="Déconnexion"
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