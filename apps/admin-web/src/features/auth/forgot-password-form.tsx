'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset, verifyPasswordReset } from '@/features/auth/api';
import {
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  type ForgotPasswordRequestValues,
  type ForgotPasswordVerifyValues,
} from '@/features/auth/schemas';
import Link from 'next/link';

type Step = 'request' | 'verify' | 'done';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const requestForm = useForm<ForgotPasswordRequestValues>({ resolver: zodResolver(forgotPasswordRequestSchema) });
  const verifyForm = useForm<ForgotPasswordVerifyValues>({ resolver: zodResolver(forgotPasswordVerifySchema) });

  async function onSubmitRequest(values: ForgotPasswordRequestValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email);
      setEmail(values.email);
      setDevCode(result.devCode ?? null);
      setStep('verify');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitVerify(values: ForgotPasswordVerifyValues) {
    setFormError(null);
    setSubmitting(true);
    try {
      await verifyPasswordReset(email, values.code, values.newPassword);
      setStep('done');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          {step === 'request' ? 'Mot de passe oublié' : step === 'verify' ? 'Réinitialisation' : 'Terminé'}
        </CardTitle>
        <CardDescription>
          {step === 'request'
            ? 'Saisissez votre e-mail : un code de récupération vous sera envoyé.'
            : step === 'verify'
              ? `Un code a été envoyé à ${email}. Saisissez-le avec votre nouveau mot de passe.`
              : 'Votre mot de passe a été réinitialisé.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'request' && (
          <form className="space-y-4" onSubmit={requestForm.handleSubmit(onSubmitRequest)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@exemple.com"
                {...requestForm.register('email')}
              />
              {requestForm.formState.errors.email && (
                <p className="text-sm text-destructive">{requestForm.formState.errors.email.message}</p>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Envoi…' : 'Recevoir le code'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link className="text-primary underline" href="/login">Retour à la connexion</Link>
            </p>
          </form>
        )}

        {step === 'verify' && (
          <form className="space-y-4" onSubmit={verifyForm.handleSubmit(onSubmitVerify)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="code">Code de récupération</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                {...verifyForm.register('code')}
              />
              {verifyForm.formState.errors.code && (
                <p className="text-sm text-destructive">{verifyForm.formState.errors.code.message}</p>
              )}
            </div>
            {devCode && (
              <p className="rounded-md bg-muted p-2 text-sm">
                Mode développement — code : <strong>{devCode}</strong>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                {...verifyForm.register('newPassword')}
              />
              {verifyForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{verifyForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...verifyForm.register('confirmPassword')}
              />
              {verifyForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{verifyForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Connectez-vous avec votre nouveau mot de passe.
            </p>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Aller à la connexion
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
