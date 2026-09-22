import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_ALT = "Task Force Présidentielle de salubrité et d'assainissement de la ville de Kinshasa";

/**
 * Logo de la Task Force Présidentielle (fichier fourni : `public/branding/logo-task-force.jpg`,
 * 1080x468). Le logo a un fond blanc : sur un fond sombre (`inverted`, barre latérale) il est posé
 * sur une carte blanche pour rester net et ne jamais être déformé (ratio conservé).
 */
export function BrandMark({ inverted = false, className }: { inverted?: boolean; className?: string }) {
  return (
    <div className={cn(inverted ? 'rounded-xl bg-white p-2 shadow-md shadow-black/20' : '', className)}>
      <Image
        src="/branding/logo-task-force.jpg"
        alt={LOGO_ALT}
        width={1080}
        height={468}
        priority
        className="h-auto w-full"
      />
    </div>
  );
}
