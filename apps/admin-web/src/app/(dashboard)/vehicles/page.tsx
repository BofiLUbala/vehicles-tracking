import { VehiclesPageClient } from '@/features/vehicles/vehicles-page-client';

export const metadata = {
  title: 'Véhicules — Tracking Vehicles',
};

export default function VehiclesPage({ searchParams }: { searchParams?: { plate?: string } }) {
  return <VehiclesPageClient initialSearch={searchParams?.plate} />;
}