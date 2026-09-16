import { SuperAdminSignupForm } from '@/features/auth/super-admin-signup-form';

export const metadata = { title: 'Créer mon compte Super Master — Tracking Vehicles' };

export default function SignupPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4"><SuperAdminSignupForm /></main>;
}
