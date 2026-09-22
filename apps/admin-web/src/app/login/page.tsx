import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';
import { BrandMark } from '@/components/brand-mark';

export const metadata = {
  title: 'Connexion — Tracking Vehicles',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-8">
      <BrandMark className="w-full max-w-sm" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
