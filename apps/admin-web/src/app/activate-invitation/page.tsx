import { ActivationForm } from '@/features/auth/activation-form';

export const metadata = { title: 'Activer mon invitation — Tracking Vehicles' };

export default function ActivateInvitationPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4"><ActivationForm /></main>;
}
