import { Badge } from '@/components/ui/badge';
import type { BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'navy';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'border-transparent bg-success/10 text-success',
  info: 'border-transparent bg-primary/10 text-primary',
  warning: 'border-transparent bg-warning/10 text-warning',
  danger: 'border-transparent bg-danger/10 text-danger',
  neutral: 'border-transparent bg-muted text-muted-foreground',
  navy: 'border-transparent bg-navy/10 text-navy',
};

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  tone?: StatusTone;
  dot?: boolean;
}

/** Badge de statut avec pastille colorée optionnelle — socle visuel des pillules statut partout. */
export function StatusBadge({ tone = 'neutral', dot = false, className, children, ...props }: StatusBadgeProps) {
  return (
    <Badge className={cn('gap-1.5', TONE_CLASSES[tone], className)} {...props}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}