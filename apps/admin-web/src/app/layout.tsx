import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '@/styles/globals.css';
import { QueryProvider } from '@/lib/query-provider';

export const metadata: Metadata = {
  title: 'Tracking Vehicles — Administration',
  description: "Tableau de bord d'administration pour le suivi de véhicules et de missions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
