import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export const metadata = {
  title: 'Mot de passe oublié — Tracking Vehicles',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
