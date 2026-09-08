import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';

export const metadata = {
  title: 'Connexion — Tracking Vehicles',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
