import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Teinte de l'icône / accent du widget. */
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'navy';
  hint?: string;
  href?: string;
}

const ACCENT_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  navy: 'bg-navy/10 text-navy',
};

/** Carte métrique "KPIs" du tableau de bord. */
export function MetricCard({ label, value, icon: Icon, accent = 'primary', hint, href }: MetricCardProps) {
  const inner = (
    <>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', ACCENT_CLASSES[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
        {hint && <p className="mt-0.5 truncate text-2xs text-muted-foreground">{hint}</p>}
      </div>
    </>
  );

  const className = cn(
    'flex w-full items-start gap-4 p-5 text-left transition-all',
    href && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  );

  return href ? (
    <Link href={href}>
      <Card className={className}>{inner}</Card>
    </Link>
  ) : (
    <Card className={className}>{inner}</Card>
  );
}