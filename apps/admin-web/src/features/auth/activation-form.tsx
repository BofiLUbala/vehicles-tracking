'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ActivationForm() {
  const [step, setStep] = useState<'profile' | 'otp' | 'done'>('profile');
  const [values, setValues] = useState({ email: '', firstName: '', lastName: '', password: '', code: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const update = (name: keyof typeof values, value: string) => setValues((old) => ({ ...old, [name]: value }));

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null); setIsError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin/activate/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: values.email }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Demande impossible');
      setDevCode(data.devCode ?? null);
      setMessage(data.message ?? null);
      setStep('otp');
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : 'Demande impossible'); }
    finally { setBusy(false); }
  }

  async function activate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(null); setIsError(false);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin/activate/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Code invalide ou expiré');
      setStep('done'); setMessage(data.message);
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : 'Activation impossible'); }
    finally { setBusy(false); }
  }

  return <Card className="w-full max-w-md"><CardHeader><CardTitle>Activer mon compte</CardTitle><CardDescription>Cette page est réservée aux administrateurs invités.</CardDescription></CardHeader><CardContent>
    {step === 'done' ? <div className="space-y-4"><p className="text-sm">{message}</p><Button asChild className="w-full"><Link href="/login">Se connecter</Link></Button></div> :
    <form className="space-y-4" onSubmit={step === 'profile' ? requestCode : activate}>
      <div><Label htmlFor="email">E-mail invité</Label><Input id="email" type="email" required disabled={step === 'otp'} value={values.email} onChange={(e) => update('email', e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" required minLength={2} disabled={step === 'otp'} value={values.firstName} onChange={(e) => update('firstName', e.target.value)} /></div><div><Label htmlFor="lastName">Nom</Label><Input id="lastName" required minLength={2} disabled={step === 'otp'} value={values.lastName} onChange={(e) => update('lastName', e.target.value)} /></div></div>
      <div><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" required minLength={8} disabled={step === 'otp'} value={values.password} onChange={(e) => update('password', e.target.value)} /></div>
      {step === 'otp' && <div><Label htmlFor="code">Code reçu par e-mail</Label><Input id="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={values.code} onChange={(e) => update('code', e.target.value)} /></div>}
      {devCode && <p className="rounded-md bg-muted p-2 text-sm">Mode développement — code : <strong>{devCode}</strong></p>}
      {message && <p className={`text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
      <Button className="w-full" disabled={busy}>{busy ? 'Traitement…' : step === 'profile' ? 'Recevoir mon code' : 'Activer mon compte'}</Button>
      <p className="text-center text-sm"><Link className="text-primary underline" href="/login">Retour à la connexion</Link></p>
    </form>}
  </CardContent></Card>;
}
