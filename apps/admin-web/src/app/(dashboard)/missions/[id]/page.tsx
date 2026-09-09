import { MissionDetailClient } from '@/features/missions/mission-detail-client';

export const metadata = {
  title: 'Détail mission — Tracking Vehicles',
};

export default function MissionDetailPage({ params }: { params: { id: string } }) {
  return <MissionDetailClient missionId={params.id} />;
}
