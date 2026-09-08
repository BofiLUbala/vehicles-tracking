'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAV_LINKS } from '@/components/nav-links';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { logout } from '@/features/auth/api';

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-5">
        <p className="text-lg font-semibold">Tracking Vehicles</p>
        <p className="text-xs text-muted-foreground">Administration</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          if (link.comingSoon) {
            return (
              <span
                key={link.href}
                title="Bientôt disponible"
                className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground/60"
              >
                {link.label}
                <span className="text-[10px] uppercase">bientôt</span>
              </span>
            );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
                active && 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-2">
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
