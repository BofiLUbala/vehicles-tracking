'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Bell, Radio, Search } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/current-user';
import { fetchAlerts } from '@/features/alerts/api';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Superviseur',
  ADMIN: 'Administrateur',
  DRIVER: 'Chauffeur',
};

export function TopHeader() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: currentUser } = useCurrentUser();
  const { data: openAlerts } = useQuery({
    queryKey: ['alerts', 'count-open'],
    queryFn: () => fetchAlerts({ status: 'NEW' }),
    refetchInterval: 60_000,
  });

  const roleLabel = currentUser ? (ROLE_LABELS[currentUser.role] ?? currentUser.role) : 'Administrateur';
  const initials = roleLabel.slice(0, 2).toUpperCase();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/vehicles?plate=${encodeURIComponent(q)}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-5">
      <div className="min-w-0 flex-1">
        <form onSubmit={handleSearchSubmit} className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un véhicule, une mission, un chauffeur…"
            aria-label="Recherche globale"
            className="h-10 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </form>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5">
        <Radio className="h-3.5 w-3.5 text-success" />
        <span className="text-sm font-semibold text-success">En direct</span>
      </div>

      <button
        type="button"
        aria-label="Alertes ouvertes"
        onClick={() => router.push('/alerts')}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {openAlerts && openAlerts.length > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-2xs font-bold text-white">
            {openAlerts.length > 99 ? '99+' : openAlerts.length}
          </span>
        )}
      </button>

      <div className="flex items-center gap-3 pl-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-navy">
          {initials}
        </div>
        <div className="hidden flex-col leading-tight sm:flex">
          <p className="text-sm font-semibold text-foreground">Admin</p>
          <p className="text-2xs text-muted-foreground">{roleLabel}</p>
        </div>
      </div>
    </header>
  );
}