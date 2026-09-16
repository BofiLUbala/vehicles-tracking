'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SuperAdminSignupForm() {
  const [step, setStep] = useState<'profile' | 'otp' | 'done'>('profile');
  const [v, setV] = useState({ email: '', firstName: '', lastName: '', password: '', code: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const update = (name: keyof typeof v, value: string) => setV((old) => ({ ...old, [name]: value }));
  async function submit(url: string, body: object) {
    const controller = new AbortController();
    // Marge volontairement large : côté API, l'envoi SMTP peut attendre jusqu'à SMTP_SEND_TIMEOUT_MS
    // (30 s par défaut) avant de basculer sur le repli de developpement.
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Opération impossible');
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error("Le serveur API ne répond pas. Vérifiez qu’il est démarré puis réessayez.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function requestOtp(e: FormEvent) { e.preventDefault(); setBusy(true); setMessage(null); setIsError(false); try { const data = await submit('/auth/admin/register/request', { email: v.email }); setDevCode(data.devCode ?? null); setMessage(data.message ?? null); setStep('otp'); } catch (x) { setIsError(true); setMessage(x instanceof Error ? x.message : 'Opération impossible'); } finally { setBusy(false); } }
  async function verify(e: FormEvent) { e.preventDefault(); setBusy(true); setMessage(null); setIsError(false); try { const data = await submit('/auth/admin/register/verify', v); setMessage(data.message); setStep('done'); } catch (x) { setIsError(true); setMessage(x instanceof Error ? x.message : 'Activation impossible'); } finally { setBusy(false); } }
  return <Card className="w-full max-w-md shadow-lg"><CardHeader className="space-y-2 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">TV</div><CardTitle className="text-2xl">Créer mon compte</CardTitle><CardDescription>Devenez Super Master et confirmez votre adresse e-mail.</CardDescription></CardHeader><CardContent>
    {step === 'done' ? <div className="space-y-4"><p className="text-sm">{message}</p><Button asChild className="w-full"><Link href="/login">Se connecter</Link></Button></div> :
    <form className="space-y-4" onSubmit={step === 'profile' ? requestOtp : verify}>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="firstName">Prénom</Label><Input id="firstName" required minLength={2} disabled={step === 'otp'} value={v.firstName} onChange={(e) => update('firstName', e.target.value)} /></div><div><Label htmlFor="lastName">Nom</Label><Input id="lastName" required minLength={2} disabled={step === 'otp'} value={v.lastName} onChange={(e) => update('lastName', e.target.value)} /></div></div>
      <div><Label htmlFor="signupEmail">E-mail</Label><Input id="signupEmail" type="email" required disabled={step === 'otp'} value={v.email} onChange={(e) => update('email', e.target.value)} /></div>
      <div><Label htmlFor="signupPassword">Mot de passe</Label><Input id="signupPassword" type="password" required minLength={8} disabled={step === 'otp'} value={v.password} onChange={(e) => update('password', e.target.value)} /></div>
      {step === 'otp' && <div><Label htmlFor="signupCode">Code OTP reçu par e-mail</Label><Input id="signupCode" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={v.code} onChange={(e) => update('code', e.target.value)} /></div>}
      {devCode && <p className="rounded-md bg-muted p-2 text-sm">Mode développement — code : <strong>{devCode}</strong></p>}
      {message && <p className={`text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
      <Button className="w-full" disabled={busy}>{busy ? 'Traitement…' : step === 'profile' ? 'Recevoir mon code OTP' : 'Créer et activer mon compte'}</Button>
      <p className="text-center text-sm"><Link className="text-primary underline" href="/login">J’ai déjà un compte</Link></p>
    </form>}
  </CardContent></Card>;
}
