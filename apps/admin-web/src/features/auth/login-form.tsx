'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDeviceId } from '@/lib/device-id';
import { loginAdmin } from '@/features/auth/api';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/tracking';

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const credentialsForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmitCredentials(values: LoginFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      await loginAdmin(values.email, values.password, deviceId);
      router.push(next);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Connectez-vous avec votre e-mail administrateur et votre mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="admin@exemple.com"
              {...credentialsForm.register('email')}
            />
            {credentialsForm.formState.errors.email && (
              <p className="text-sm text-destructive">{credentialsForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...credentialsForm.register('password')}
            />
            {credentialsForm.formState.errors.password && (
              <p className="text-sm text-destructive">{credentialsForm.formState.errors.password.message}</p>
            )}
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </Button>
          <div className="space-y-1 text-center text-sm text-muted-foreground">
            <p><Link className="text-primary underline" href="/forgot-password">Mot de passe oublié ?</Link></p>
            <p><Link className="text-primary underline" href="/signup">Créer mon compte Super Master</Link></p>
            <p>Invité par un administrateur ? <Link className="text-primary underline" href="/activate-invitation">Activer mon invitation</Link></p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
