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
import { loginAdmin, verifyAdminOtp } from '@/features/auth/api';
import { loginSchema, otpSchema, type LoginFormValues, type OtpFormValues } from '@/features/auth/schemas';

type Step = 'credentials' | 'otp';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/tracking';

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const credentialsForm = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });
  const otpForm = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  async function onSubmitCredentials(values: LoginFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      const result = await loginAdmin(values.email, values.password, deviceId);
      if (result.requiresOtp) {
        setEmail(values.email);
        setStep('otp');
      } else {
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitOtp(values: OtpFormValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      await verifyAdminOtp(email, values.code, deviceId);
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
        <CardTitle>{step === 'credentials' ? 'Connexion' : 'Vérification'}</CardTitle>
        <CardDescription>
          {step === 'credentials'
            ? 'Connectez-vous avec votre e-mail administrateur.'
            : `Un code a été envoyé à ${email}. Saisissez-le pour continuer.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'credentials' ? (
          <form key="credentials" className="space-y-4" onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)} noValidate>
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
          </form>
        ) : (
          <form key="otp" className="space-y-4" onSubmit={otpForm.handleSubmit(onSubmitOtp)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="code">Code de vérification</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                {...otpForm.register('code')}
              />
              {otpForm.formState.errors.code && (
                <p className="text-sm text-destructive">{otpForm.formState.errors.code.message}</p>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Vérification…' : 'Vérifier'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => {
                setStep('credentials');
                setFormError(null);
              }}
            >
              Retour
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
